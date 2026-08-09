// Database types matching Supabase schema

export interface Project {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  description?: string | null;
  color: string;
  icon: string | null;
  view_style: "list" | "board";
  sort_order: number;
  is_inbox: boolean;
  is_archived: boolean;
  is_favorite: boolean;
  created_at: string;
}

export interface Section {
  id: string;
  project_id: string;
  name: string;
  description?: string | null;
  sort_order: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string;
  section_id: string | null;
  parent_id: string | null;
  content: string;
  description: string;
  priority: 1 | 2 | 3 | 4;
  due_date: string | null;
  due_time: string | null;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
  recurrence: RecurrenceRule | null;
  labels: string[];
  created_at: string;
}

export interface RecurrenceRule {
  rule: string;
  next_date?: string;
}

export interface Label {
  id: string;
  user_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_favorite: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
}

export interface Filter {
  id: string;
  user_id: string;
  name: string;
  query: string;
  color: string;
  sort_order: number;
  is_favorite: boolean;
  created_at: string;
}

// Expense types
export interface Wallet {
  id: string;
  user_id: string;
  name: string;
  type: "cash" | "bank" | "ewallet";
  balance: number;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  name_vi: string | null;
  type: "income" | "expense";
  icon: string | null;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  relationship: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: "income" | "expense" | "transfer";
  amount: number;
  category_id: string | null;
  wallet_id: string | null;
  to_wallet_id: string | null;
  person_id: string | null;
  note: string | null;
  date: string;
  source: "manual" | "bulk" | "image";
  attachment_url: string | null;
  created_at: string;
}

export interface InvestmentAccount {
  id: string;
  user_id: string;
  platform: string;
  name: string;
  type: string | null;
  balance: number;
  invested: number;
  is_active: boolean;
  created_at: string;
}

export interface InvestmentTransaction {
  id: string;
  account_id: string;
  type: "buy" | "profit" | "loss" | "sell";
  amount: number;
  note: string | null;
  date: string;
  created_at: string;
}

// Project with nested children (for tree display)
export interface ProjectWithChildren extends Project {
  children: ProjectWithChildren[];
}

// Task with nested children (for sub-tasks)
export interface TaskWithChildren extends Task {
  children: Task[];
}
