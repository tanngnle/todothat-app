-- ═══════════════════════════════════════════════════════════════
-- 007: Break the remaining RLS policy cycles (Postgres error 42P17)
--
-- Migration 006 fixed the projects <-> project_members cycle, but the
-- same class of bug remained on every other table whose policy bodies
-- run subqueries against another RLS-protected table:
--
--   project_members -> project_members (SELF, all 4 policies) + projects
--   tasks           -> project_members
--   sections        -> project_members + projects
--   task_assignees  -> tasks -> (project_members + projects)
--   comments        -> tasks
--
-- Symptom: INSERT INTO tasks fails with
--   {"code":"42P17","message":"infinite recursion detected in policy
--    for relation \"project_members\""}
-- because evaluating the tasks policy re-enters RLS on project_members,
-- whose policies re-enter project_members again (self-reference).
--
-- Fix: rewrite every affected policy in terms of the SECURITY DEFINER
-- helper functions introduced in 006 (extended here). SECURITY DEFINER
-- executes as the function owner, so RLS is never re-applied inside a
-- helper and no policy body triggers RLS on another table. Access
-- semantics of migration 003 are preserved EXACTLY per table:
--   tasks           -> owner OR any member            (all commands)
--   sections        -> member OR project owner (read/delete),
--                      owner/admin member OR project owner (write)
--   comments        -> owner of the parent task       (all commands)
--   project_members -> own rows / project owner / role-scoped member
--   task_assignees  -> self / task's project owner / role-scoped member
-- Finance table policies (pure user_id = auth.uid()) are untouched.
-- ═══════════════════════════════════════════════════════════════

-- ── New SECURITY DEFINER helpers (extend 006's pair) ──────────────────

-- Is the caller the OWNER of the project?
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = p_project_id
      AND user_id = auth.uid()
  );
$$;

-- Is the caller the OWNER of the task?
CREATE OR REPLACE FUNCTION public.is_task_owner(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks
    WHERE id = p_task_id
      AND user_id = auth.uid()
  );
$$;

-- Does the task belong to a project the caller OWNS?
CREATE OR REPLACE FUNCTION public.is_task_project_owner(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE t.id = p_task_id
      AND p.user_id = auth.uid()
  );
$$;

-- Is the caller ANY member of the task's project?
CREATE OR REPLACE FUNCTION public.is_task_project_member(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.project_members pm ON pm.project_id = t.project_id
    WHERE t.id = p_task_id
      AND pm.user_id = auth.uid()
  );
$$;

-- Is the caller an owner/admin member of the task's project?
CREATE OR REPLACE FUNCTION public.is_task_project_write_member(p_task_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.project_members pm ON pm.project_id = t.project_id
    WHERE t.id = p_task_id
      AND pm.user_id = auth.uid()
      AND pm.role IN ('owner', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.is_project_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid)
  TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_task_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_task_owner(uuid)
  TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_task_project_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_task_project_owner(uuid)
  TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_task_project_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_task_project_member(uuid)
  TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_task_project_write_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_task_project_write_member(uuid)
  TO anon, authenticated, service_role;

-- ── Drop every cyclic policy (idempotent re-run safe) ─────────────────
DROP POLICY IF EXISTS "tasks_shared_access" ON tasks;
DROP POLICY IF EXISTS "sections_shared_access" ON sections;
DROP POLICY IF EXISTS "user_own_comments" ON comments;
DROP POLICY IF EXISTS "project_members_select" ON project_members;
DROP POLICY IF EXISTS "project_members_insert" ON project_members;
DROP POLICY IF EXISTS "project_members_update" ON project_members;
DROP POLICY IF EXISTS "project_members_delete" ON project_members;
DROP POLICY IF EXISTS "task_assignees_select" ON task_assignees;
DROP POLICY IF EXISTS "task_assignees_insert" ON task_assignees;
DROP POLICY IF EXISTS "task_assignees_delete" ON task_assignees;
-- New names, also dropped so this migration can be re-applied cleanly.
DROP POLICY IF EXISTS "tasks_select_own_or_member" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_own_or_member" ON tasks;
DROP POLICY IF EXISTS "tasks_update_own_or_member" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_own_or_member" ON tasks;
DROP POLICY IF EXISTS "sections_select_member_or_owner" ON sections;
DROP POLICY IF EXISTS "sections_insert_admin_or_owner" ON sections;
DROP POLICY IF EXISTS "sections_update_admin_or_owner" ON sections;
DROP POLICY IF EXISTS "sections_delete_member_or_owner" ON sections;
DROP POLICY IF EXISTS "comments_task_owner_access" ON comments;
DROP POLICY IF EXISTS "project_members_select_safe" ON project_members;
DROP POLICY IF EXISTS "project_members_insert_safe" ON project_members;
DROP POLICY IF EXISTS "project_members_update_safe" ON project_members;
DROP POLICY IF EXISTS "project_members_delete_safe" ON project_members;
DROP POLICY IF EXISTS "task_assignees_select_safe" ON task_assignees;
DROP POLICY IF EXISTS "task_assignees_insert_safe" ON task_assignees;
DROP POLICY IF EXISTS "task_assignees_delete_safe" ON task_assignees;

-- ── tasks: owner OR any project member (003 USING == WITH CHECK) ──────
CREATE POLICY "tasks_select_own_or_member" ON tasks
  FOR SELECT
  USING (user_id = auth.uid() OR public.is_project_member(project_id));

CREATE POLICY "tasks_insert_own_or_member" ON tasks
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_project_member(project_id));

CREATE POLICY "tasks_update_own_or_member" ON tasks
  FOR UPDATE
  USING (user_id = auth.uid() OR public.is_project_member(project_id))
  WITH CHECK (user_id = auth.uid() OR public.is_project_member(project_id));

CREATE POLICY "tasks_delete_own_or_member" ON tasks
  FOR DELETE
  USING (user_id = auth.uid() OR public.is_project_member(project_id));

-- ── sections: read/delete = member OR project owner;
--              write = owner/admin member OR project owner (003) ───────
CREATE POLICY "sections_select_member_or_owner" ON sections
  FOR SELECT
  USING (
    public.is_project_member(project_id)
    OR public.is_project_owner(project_id)
  );

CREATE POLICY "sections_insert_admin_or_owner" ON sections
  FOR INSERT
  WITH CHECK (
    public.is_project_write_member(project_id)
    OR public.is_project_owner(project_id)
  );

CREATE POLICY "sections_update_admin_or_owner" ON sections
  FOR UPDATE
  USING (
    public.is_project_member(project_id)
    OR public.is_project_owner(project_id)
  )
  WITH CHECK (
    public.is_project_write_member(project_id)
    OR public.is_project_owner(project_id)
  );

CREATE POLICY "sections_delete_member_or_owner" ON sections
  FOR DELETE
  USING (
    public.is_project_member(project_id)
    OR public.is_project_owner(project_id)
  );

-- ── comments: owner of the parent task only (001 semantics; the table
--              has no user_id column, ownership is via tasks) ──────────
CREATE POLICY "comments_task_owner_access" ON comments
  FOR ALL
  USING (public.is_task_owner(task_id))
  WITH CHECK (public.is_task_owner(task_id));

-- ── project_members: own rows / project owner / role-scoped member ────
-- SELECT: own membership rows, or anything in a project you own or are
-- any-role member of (003 semantics).
CREATE POLICY "project_members_select_safe" ON project_members
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_project_owner(project_id)
    OR public.is_project_member(project_id)
  );

-- INSERT: only a project owner or an owner/admin member may add members
-- (003 semantics — no self-grant clause existed there either).
CREATE POLICY "project_members_insert_safe" ON project_members
  FOR INSERT
  WITH CHECK (
    public.is_project_owner(project_id)
    OR public.is_project_write_member(project_id)
  );

-- UPDATE / DELETE: own row, project owner, or owner/admin member (003).
-- No WITH CHECK on UPDATE — matches 003, which defined USING only.
CREATE POLICY "project_members_update_safe" ON project_members
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.is_project_owner(project_id)
    OR public.is_project_write_member(project_id)
  );

CREATE POLICY "project_members_delete_safe" ON project_members
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.is_project_owner(project_id)
    OR public.is_project_write_member(project_id)
  );

-- ── task_assignees: self / task's project owner / role-scoped member ──
CREATE POLICY "task_assignees_select_safe" ON task_assignees
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_task_project_owner(task_id)
    OR public.is_task_project_member(task_id)
  );

CREATE POLICY "task_assignees_insert_safe" ON task_assignees
  FOR INSERT
  WITH CHECK (
    public.is_task_project_owner(task_id)
    OR public.is_task_project_member(task_id)
  );

CREATE POLICY "task_assignees_delete_safe" ON task_assignees
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.is_task_project_owner(task_id)
    OR public.is_task_project_write_member(task_id)
  );
