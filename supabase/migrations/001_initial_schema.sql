-- ═══════════════════════════════════════════════════════════════
-- Initial Schema: Task Management + Expense Tracking + Investments
-- ═══════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════
-- TASK MANAGEMENT
-- ═══════════════════════════════════════════

CREATE TABLE projects (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) NOT NULL,
  parent_id     UUID REFERENCES projects(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  color         TEXT DEFAULT '#246fe0',
  icon          TEXT,
  view_style    TEXT DEFAULT 'list' CHECK (view_style IN ('list', 'board')),
  sort_order    DOUBLE PRECISION NOT NULL DEFAULT 65536,
  is_inbox      BOOLEAN DEFAULT FALSE,
  is_archived   BOOLEAN DEFAULT FALSE,
  is_favorite   BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sections (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  DOUBLE PRECISION NOT NULL DEFAULT 65536,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tasks (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) NOT NULL,
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  section_id    UUID REFERENCES sections(id) ON DELETE SET NULL,
  parent_id     UUID REFERENCES tasks(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  description   TEXT DEFAULT '',
  priority      INT DEFAULT 1 CHECK (priority BETWEEN 1 AND 4),
  due_date      DATE,
  due_time      TIMESTAMPTZ,
  is_completed  BOOLEAN DEFAULT FALSE,
  completed_at  TIMESTAMPTZ,
  sort_order    DOUBLE PRECISION NOT NULL DEFAULT 65536,
  recurrence    JSONB,
  labels        TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE labels (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  name        TEXT NOT NULL,
  color       TEXT DEFAULT '#246fe0',
  sort_order  DOUBLE PRECISION NOT NULL DEFAULT 65536,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE comments (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id     UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE filters (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  name        TEXT NOT NULL,
  query       TEXT NOT NULL,
  color       TEXT DEFAULT '#246fe0',
  sort_order  DOUBLE PRECISION NOT NULL DEFAULT 65536,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- EXPENSE TRACKING
-- ═══════════════════════════════════════════

CREATE TABLE wallets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT DEFAULT 'cash',
  balance     BIGINT DEFAULT 0,
  color       TEXT,
  icon        TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  DOUBLE PRECISION NOT NULL DEFAULT 65536,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE expense_categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  parent_id   UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  name_vi     TEXT,
  type        TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon        TEXT,
  color       TEXT,
  sort_order  DOUBLE PRECISION NOT NULL DEFAULT 65536,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE people (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) NOT NULL,
  name          TEXT NOT NULL,
  relationship  TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  amount        BIGINT NOT NULL,
  category_id   UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
  wallet_id     UUID REFERENCES wallets(id),
  to_wallet_id  UUID REFERENCES wallets(id),
  person_id     UUID REFERENCES people(id),
  note          TEXT,
  date          DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- INVESTMENT TRACKING
-- ═══════════════════════════════════════════

CREATE TABLE investment_accounts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) NOT NULL,
  platform    TEXT NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT,
  balance     BIGINT DEFAULT 0,
  invested    BIGINT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE investment_transactions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id  UUID NOT NULL REFERENCES investment_accounts(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('buy', 'profit', 'loss', 'sell')),
  amount      BIGINT NOT NULL,
  note        TEXT,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════

CREATE INDEX idx_tasks_project ON tasks(project_id) WHERE is_completed = false;
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date) WHERE is_completed = false;
CREATE INDEX idx_tasks_parent ON tasks(parent_id);
CREATE INDEX idx_tasks_section ON tasks(section_id);
CREATE INDEX idx_transactions_date ON transactions(user_id, date);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_projects_user ON projects(user_id) WHERE is_archived = false;

-- ═══════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE filters ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;

-- Policies: user can only access their own data
CREATE POLICY "user_own_projects" ON projects FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_own_sections" ON sections FOR ALL USING (
  EXISTS (SELECT 1 FROM projects WHERE projects.id = sections.project_id AND projects.user_id = auth.uid())
);
CREATE POLICY "user_own_tasks" ON tasks FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_own_labels" ON labels FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_own_comments" ON comments FOR ALL USING (
  EXISTS (SELECT 1 FROM tasks WHERE tasks.id = comments.task_id AND tasks.user_id = auth.uid())
);
CREATE POLICY "user_own_filters" ON filters FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_own_wallets" ON wallets FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_own_expense_categories" ON expense_categories FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_own_people" ON people FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_own_transactions" ON transactions FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_own_investment_accounts" ON investment_accounts FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_own_investment_transactions" ON investment_transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM investment_accounts WHERE investment_accounts.id = investment_transactions.account_id AND investment_accounts.user_id = auth.uid())
);
