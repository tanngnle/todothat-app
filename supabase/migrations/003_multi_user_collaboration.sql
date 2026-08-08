-- Multi-user collaboration schema
-- Run this migration to enable project sharing and collaboration

-- Project members table
CREATE TABLE IF NOT EXISTS project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Task assignments table
CREATE TABLE IF NOT EXISTS task_assignees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

-- Update RLS policies for multi-user access

-- Projects: visible to members
DROP POLICY IF EXISTS "user_own_projects" ON projects;
CREATE POLICY "projects_shared_access" ON projects
  FOR ALL
  USING (
    user_id = auth.uid() OR
    id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Tasks: visible to project members
DROP POLICY IF EXISTS "user_own_tasks" ON tasks;
CREATE POLICY "tasks_shared_access" ON tasks
  FOR ALL
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id = auth.uid() OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Sections: visible to project members
DROP POLICY IF EXISTS "user_own_sections" ON sections;
CREATE POLICY "sections_shared_access" ON sections
  FOR ALL
  USING (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    ) OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ) OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Enable RLS on new tables
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignees ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_members
CREATE POLICY "project_members_select" ON project_members
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    ) OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "project_members_insert" ON project_members
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    ) OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "project_members_update" ON project_members
  FOR UPDATE
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    ) OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "project_members_delete" ON project_members
  FOR DELETE
  USING (
    user_id = auth.uid() OR
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    ) OR
    project_id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- RLS policies for task_assignees
CREATE POLICY "task_assignees_select" ON task_assignees
  FOR SELECT
  USING (
    user_id = auth.uid() OR
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      ) OR t.project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "task_assignees_insert" ON task_assignees
  FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      ) OR t.project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "task_assignees_delete" ON task_assignees
  FOR DELETE
  USING (
    user_id = auth.uid() OR
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (
        SELECT id FROM projects WHERE user_id = auth.uid()
      ) OR t.project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
  );
