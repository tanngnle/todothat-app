-- ═══════════════════════════════════════════════════════════════
-- 006: Fix RLS infinite recursion on projects (Postgres error 42P17)
--
-- Symptom: every INSERT into projects fails with
--   {"code":"42P17","message":"infinite recursion detected in policy
--    for relation \"projects\""}
-- which breaks ensureInboxProject() and therefore Quick Add (500 on
-- POST /) on the deployed app.
--
-- Root cause: migration 003 replaced the simple
--   user_id = auth.uid()
-- policy with a single FOR ALL policy (projects_shared_access) whose
-- USING / WITH CHECK expressions run subqueries against project_members.
-- The project_members policies in turn reference projects, so evaluating
-- the projects policy re-enters RLS evaluation on project_members and
-- back again — a policy cycle that Postgres aborts with 42P17 whenever
-- the INSERT branch is evaluated.
--
-- Fix: replace the single FOR ALL policy with per-command policies that
-- preserve migration 003's access model EXACTLY, but keep the INSERT
-- policy self-contained (owners insert their own projects) and route the
-- membership checks for SELECT / UPDATE / DELETE through SECURITY DEFINER
-- helper functions. SECURITY DEFINER executes as the function owner, so
-- RLS is not re-applied inside the membership lookup and the cycle is
-- broken. No access is granted beyond what 003 already allowed:
--   SELECT  -> owner OR any member            (003 USING)
--   INSERT  -> owner only                     (user_id = auth.uid())
--   UPDATE  -> owner OR member; new row must be owner OR owner/admin
--                                            member (003 USING/WITH CHECK)
--   DELETE  -> owner OR any member            (003 USING, via FOR ALL)
-- ═══════════════════════════════════════════════════════════════

-- ── Helper: is the caller a member of the project (any role)? ─────────
-- SECURITY DEFINER so the lookup does not re-enter RLS (the recursion
-- this migration exists to remove). STABLE: one evaluation per row scan.
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  );
$$;

-- ── Helper: is the caller an owner/admin member of the project? ───────
CREATE OR REPLACE FUNCTION public.is_project_write_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;

-- Keep the helpers callable from every client role the app uses; the
-- bodies are parameterized and scoped by auth.uid(), so they leak no
-- other user's data.
REVOKE ALL ON FUNCTION public.is_project_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid)
  TO anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_project_write_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_project_write_member(uuid)
  TO anon, authenticated, service_role;

-- ── Replace the recursive FOR ALL policy ──────────────────────────────
-- Idempotent: safe to re-run (e.g. applied manually first, then via db push).
DROP POLICY IF EXISTS "projects_shared_access" ON projects;
DROP POLICY IF EXISTS "projects_select_own_or_member" ON projects;
DROP POLICY IF EXISTS "projects_insert_own" ON projects;
DROP POLICY IF EXISTS "projects_update_own_or_admin_member" ON projects;
DROP POLICY IF EXISTS "projects_delete_own_or_member" ON projects;

CREATE POLICY "projects_select_own_or_member" ON projects
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_project_member(id)
  );

-- Self-contained on purpose: never reference another RLS-protected table
-- here — that is what caused 42P17. Only owners create projects.
CREATE POLICY "projects_insert_own" ON projects
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_update_own_or_admin_member" ON projects
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.is_project_member(id)
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_project_write_member(id)
  );

CREATE POLICY "projects_delete_own_or_member" ON projects
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR public.is_project_member(id)
  );
