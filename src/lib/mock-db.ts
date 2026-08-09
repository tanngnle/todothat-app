// Mock database with sample data for development without Supabase
// This simulates all Supabase operations in-memory

import type {
  Project,
  Section,
  Task,
  Label,
  Comment,
  Filter,
  Wallet,
  ExpenseCategory,
  Person,
  Transaction,
  InvestmentAccount,
  InvestmentTransaction,
} from "@/types/database";

const MOCK_USER_ID = "mock-user-001";

// ─── Projects ───────────────────────────────────────────────
const mockProjects: Project[] = [
  {
    id: "proj-inbox",
    user_id: MOCK_USER_ID,
    parent_id: null,
    name: "Inbox",
    color: "#246fe0",
    icon: "📥",
    view_style: "list",
    sort_order: 0,
    is_inbox: true,
    is_archived: false,
    is_favorite: true,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "proj-work",
    user_id: MOCK_USER_ID,
    parent_id: null,
    name: "Work",
    color: "#e05524",
    icon: "",
    view_style: "list",
    sort_order: 65536,
    is_inbox: false,
    is_archived: false,
    is_favorite: true,
    created_at: "2026-01-02T00:00:00Z",
  },
  {
    id: "proj-personal",
    user_id: MOCK_USER_ID,
    parent_id: null,
    name: "Personal",
    color: "#24e06f",
    icon: "",
    view_style: "list",
    sort_order: 131072,
    is_inbox: false,
    is_archived: false,
    is_favorite: false,
    created_at: "2026-01-03T00:00:00Z",
  },
  {
    id: "proj-health",
    user_id: MOCK_USER_ID,
    parent_id: "proj-personal",
    name: "Health & Fitness",
    color: "#24e06f",
    icon: "💪",
    view_style: "list",
    sort_order: 65536,
    is_inbox: false,
    is_archived: false,
    is_favorite: false,
    created_at: "2026-01-04T00:00:00Z",
  },
  {
    id: "proj-learning",
    user_id: MOCK_USER_ID,
    parent_id: null,
    name: "Learning",
    color: "#a855f7",
    icon: "📚",
    view_style: "board",
    sort_order: 196608,
    is_inbox: false,
    is_archived: false,
    is_favorite: true,
    created_at: "2026-01-05T00:00:00Z",
  },
];

// ─── Sections ───────────────────────────────────────────────
const mockSections: Section[] = [
  { id: "sec-backlog", project_id: "proj-work", name: "Backlog", sort_order: 65536, created_at: "2026-01-02T00:00:00Z" },
  { id: "sec-active", project_id: "proj-work", name: "In Progress", sort_order: 131072, created_at: "2026-01-02T00:00:00Z" },
  { id: "sec-done", project_id: "proj-work", name: "Done", sort_order: 196608, created_at: "2026-01-02T00:00:00Z" },
  { id: "sec-weekly", project_id: "proj-learning", name: "This Week", sort_order: 65536, created_at: "2026-01-05T00:00:00Z" },
  { id: "sec-monthly", project_id: "proj-learning", name: "This Month", sort_order: 131072, created_at: "2026-01-05T00:00:00Z" },
];

// ─── Tasks ──────────────────────────────────────────────────
const today = new Date();
const todayStr = today.toISOString().split("T")[0];
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowStr = tomorrow.toISOString().split("T")[0];
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const yesterdayStr = yesterday.toISOString().split("T")[0];
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 5);
const nextWeekStr = nextWeek.toISOString().split("T")[0];

const mockTasks: Task[] = [
  // Inbox tasks
  {
    id: "task-1",
    user_id: MOCK_USER_ID,
    project_id: "proj-inbox",
    section_id: null,
    parent_id: null,
    content: "Review Q3 financial report",
    description: "Check all expense categories and verify against bank statements",
    priority: 2,
    due_date: todayStr,
    due_time: null,
    is_completed: false,
    completed_at: null,
    sort_order: 65536,
    recurrence: null,
    labels: ["work", "finance"],
    created_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "task-2",
    user_id: MOCK_USER_ID,
    project_id: "proj-inbox",
    section_id: null,
    parent_id: null,
    content: "Buy groceries for the week",
    description: "",
    priority: 3,
    due_date: todayStr,
    due_time: null,
    is_completed: false,
    completed_at: null,
    sort_order: 131072,
    recurrence: null,
    labels: ["personal"],
    created_at: "2026-08-02T00:00:00Z",
  },
  {
    id: "task-3",
    user_id: MOCK_USER_ID,
    project_id: "proj-inbox",
    section_id: null,
    parent_id: null,
    content: "Call dentist to reschedule appointment",
    description: "",
    priority: 4,
    due_date: tomorrowStr,
    due_time: null,
    is_completed: false,
    completed_at: null,
    sort_order: 196608,
    recurrence: null,
    labels: ["health"],
    created_at: "2026-08-03T00:00:00Z",
  },
  // Work tasks
  {
    id: "task-4",
    user_id: MOCK_USER_ID,
    project_id: "proj-work",
    section_id: "sec-active",
    parent_id: null,
    content: "Finish API integration for payment gateway",
    description: "Complete Stripe webhook handlers and test all edge cases",
    priority: 1,
    due_date: todayStr,
    due_time: null,
    is_completed: false,
    completed_at: null,
    sort_order: 65536,
    recurrence: null,
    labels: ["work", "urgent"],
    created_at: "2026-07-28T00:00:00Z",
  },
  {
    id: "task-5",
    user_id: MOCK_USER_ID,
    project_id: "proj-work",
    section_id: "sec-active",
    parent_id: null,
    content: "Code review for PR #234",
    description: "",
    priority: 2,
    due_date: todayStr,
    due_time: null,
    is_completed: false,
    completed_at: null,
    sort_order: 131072,
    recurrence: null,
    labels: ["work"],
    created_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "task-6",
    user_id: MOCK_USER_ID,
    project_id: "proj-work",
    section_id: "sec-backlog",
    parent_id: null,
    content: "Write unit tests for auth module",
    description: "",
    priority: 3,
    due_date: nextWeekStr,
    due_time: null,
    is_completed: false,
    completed_at: null,
    sort_order: 65536,
    recurrence: null,
    labels: ["work"],
    created_at: "2026-07-25T00:00:00Z",
  },
  {
    id: "task-7",
    user_id: MOCK_USER_ID,
    project_id: "proj-work",
    section_id: "sec-done",
    parent_id: null,
    content: "Set up CI/CD pipeline",
    description: "",
    priority: 2,
    due_date: yesterdayStr,
    due_time: null,
    is_completed: true,
    completed_at: "2026-08-06T15:30:00Z",
    sort_order: 65536,
    recurrence: null,
    labels: ["work", "devops"],
    created_at: "2026-07-20T00:00:00Z",
  },
  // Overdue task
  {
    id: "task-8",
    user_id: MOCK_USER_ID,
    project_id: "proj-inbox",
    section_id: null,
    parent_id: null,
    content: "Submit expense report for July",
    description: "Include all receipts and categorize properly",
    priority: 1,
    due_date: yesterdayStr,
    due_time: null,
    is_completed: false,
    completed_at: null,
    sort_order: 262144,
    recurrence: null,
    labels: ["finance", "urgent"],
    created_at: "2026-07-30T00:00:00Z",
  },
  // Personal tasks
  {
    id: "task-9",
    user_id: MOCK_USER_ID,
    project_id: "proj-personal",
    section_id: null,
    parent_id: null,
    content: "Plan weekend trip to Da Lat",
    description: "Book hotel, check weather, pack list",
    priority: 3,
    due_date: nextWeekStr,
    due_time: null,
    is_completed: false,
    completed_at: null,
    sort_order: 65536,
    recurrence: null,
    labels: ["personal", "travel"],
    created_at: "2026-08-01T00:00:00Z",
  },
  // Health sub-tasks
  {
    id: "task-10",
    user_id: MOCK_USER_ID,
    project_id: "proj-health",
    section_id: null,
    parent_id: null,
    content: "Morning workout routine",
    description: "30 min cardio + 20 min strength",
    priority: 2,
    due_date: todayStr,
    due_time: null,
    is_completed: false,
    completed_at: null,
    sort_order: 65536,
    recurrence: { rule: "every weekday", next_date: tomorrowStr },
    labels: ["health"],
    created_at: "2026-07-15T00:00:00Z",
  },
  {
    id: "task-11",
    user_id: MOCK_USER_ID,
    project_id: "proj-health",
    section_id: null,
    parent_id: "task-10",
    content: "5km run",
    description: "",
    priority: 3,
    due_date: todayStr,
    due_time: null,
    is_completed: false,
    completed_at: null,
    sort_order: 65536,
    recurrence: null,
    labels: ["health"],
    created_at: "2026-07-15T00:00:00Z",
  },
  {
    id: "task-12",
    user_id: MOCK_USER_ID,
    project_id: "proj-health",
    section_id: null,
    parent_id: "task-10",
    content: "Stretching & yoga",
    description: "",
    priority: 4,
    due_date: todayStr,
    due_time: null,
    is_completed: false,
    completed_at: null,
    sort_order: 131072,
    recurrence: null,
    labels: ["health"],
    created_at: "2026-07-15T00:00:00Z",
  },
  // Learning tasks
  {
    id: "task-13",
    user_id: MOCK_USER_ID,
    project_id: "proj-learning",
    section_id: "sec-weekly",
    parent_id: null,
    content: "Complete Next.js 16 course module 5",
    description: "Server Actions and caching strategies",
    priority: 2,
    due_date: nextWeekStr,
    due_time: null,
    is_completed: false,
    completed_at: null,
    sort_order: 65536,
    recurrence: null,
    labels: ["learning", "dev"],
    created_at: "2026-08-01T00:00:00Z",
  },
  {
    id: "task-14",
    user_id: MOCK_USER_ID,
    project_id: "proj-learning",
    section_id: "sec-monthly",
    parent_id: null,
    content: "Read 'Designing Data-Intensive Applications' Ch. 8",
    description: "",
    priority: 4,
    due_date: null,
    due_time: null,
    is_completed: false,
    completed_at: null,
    sort_order: 65536,
    recurrence: null,
    labels: ["learning"],
    created_at: "2026-07-20T00:00:00Z",
  },
];

// ─── Labels ─────────────────────────────────────────────────
const mockLabels: Label[] = [
  { id: "lbl-work", user_id: MOCK_USER_ID, name: "work", color: "#e05524", sort_order: 65536, is_favorite: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "lbl-personal", user_id: MOCK_USER_ID, name: "personal", color: "#24e06f", sort_order: 131072, is_favorite: false, created_at: "2026-01-01T00:00:00Z" },
  { id: "lbl-health", user_id: MOCK_USER_ID, name: "health", color: "#24e06f", sort_order: 196608, is_favorite: false, created_at: "2026-01-01T00:00:00Z" },
  { id: "lbl-finance", user_id: MOCK_USER_ID, name: "finance", color: "#f59e0b", sort_order: 262144, is_favorite: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "lbl-urgent", user_id: MOCK_USER_ID, name: "urgent", color: "#ef4444", sort_order: 327680, is_favorite: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "lbl-learning", user_id: MOCK_USER_ID, name: "learning", color: "#a855f7", sort_order: 393216, is_favorite: false, created_at: "2026-01-01T00:00:00Z" },
  { id: "lbl-dev", user_id: MOCK_USER_ID, name: "dev", color: "#3b82f6", sort_order: 458752, is_favorite: false, created_at: "2026-01-01T00:00:00Z" },
  { id: "lbl-travel", user_id: MOCK_USER_ID, name: "travel", color: "#06b6d4", sort_order: 524288, is_favorite: false, created_at: "2026-01-01T00:00:00Z" },
  { id: "lbl-devops", user_id: MOCK_USER_ID, name: "devops", color: "#6366f1", sort_order: 589824, is_favorite: false, created_at: "2026-01-01T00:00:00Z" },
];

// ─── Comments ───────────────────────────────────────────────
const mockComments: Comment[] = [
  { id: "cmt-1", task_id: "task-4", content: "Stripe docs say we need to handle idempotency keys for all webhook events", created_at: "2026-08-05T10:00:00Z" },
  { id: "cmt-2", task_id: "task-4", content: "Added retry logic with exponential backoff", created_at: "2026-08-06T14:30:00Z" },
  { id: "cmt-3", task_id: "task-9", content: "Found a great hotel at 800k/night, should I book?", created_at: "2026-08-03T09:00:00Z" },
];

// ─── Filters ────────────────────────────────────────────────
const mockFilters: Filter[] = [
  { id: "flt-1", user_id: MOCK_USER_ID, name: "Urgent & Today", query: "today & p1", color: "#ef4444", sort_order: 65536, is_favorite: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "flt-2", user_id: MOCK_USER_ID, name: "Work This Week", query: "#work & this week", color: "#e05524", sort_order: 131072, is_favorite: false, created_at: "2026-01-01T00:00:00Z" },
];

// ─── Wallets ────────────────────────────────────────────────
const mockWallets: Wallet[] = [
  { id: "wal-cash", user_id: MOCK_USER_ID, name: "Tiền mặt", type: "cash", balance: 2500000, color: "#4CAF50", icon: "💵", is_active: true, sort_order: 65536, created_at: "2026-01-01T00:00:00Z" },
  { id: "wal-vcb", user_id: MOCK_USER_ID, name: "Vietcombank", type: "bank", balance: 15000000, color: "#1565C0", icon: "🏦", is_active: true, sort_order: 131072, created_at: "2026-01-01T00:00:00Z" },
  { id: "wal-momo", user_id: MOCK_USER_ID, name: "MoMo", type: "ewallet", balance: 800000, color: "#E91E63", icon: "", is_active: true, sort_order: 196608, created_at: "2026-01-01T00:00:00Z" },
  { id: "wal-tikop", user_id: MOCK_USER_ID, name: "Tikop", type: "ewallet", balance: 5000000, color: "#7B1FA2", icon: "📱", is_active: true, sort_order: 262144, created_at: "2026-01-01T00:00:00Z" },
  { id: "wal-fmarket", user_id: MOCK_USER_ID, name: "Fmarket", type: "ewallet", balance: 12000000, color: "#FF6F00", icon: "", is_active: true, sort_order: 327680, created_at: "2026-01-01T00:00:00Z" },
];

// ─── Expense Categories ─────────────────────────────────────
const mockCategories: ExpenseCategory[] = [
  // Expense categories
  { id: "cat-food", user_id: MOCK_USER_ID, parent_id: null, name: "Ăn uống", name_vi: "Ăn uống", type: "expense", icon: "", color: "#FF6B35", sort_order: 65536, is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "cat-food-meal", user_id: MOCK_USER_ID, parent_id: "cat-food", name: "Tiền ăn", name_vi: "Tiền ăn", type: "expense", icon: null, color: null, sort_order: 65536, is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "cat-food-drink", user_id: MOCK_USER_ID, parent_id: "cat-food", name: "Tiền uống", name_vi: "Tiền uống", type: "expense", icon: null, color: null, sort_order: 131072, is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "cat-transport", user_id: MOCK_USER_ID, parent_id: null, name: "Di chuyển", name_vi: "Di chuyển", type: "expense", icon: "🚗", color: "#4CAF50", sort_order: 131072, is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "cat-shopping", user_id: MOCK_USER_ID, parent_id: null, name: "Mua sắm", name_vi: "Mua sắm", type: "expense", icon: "🛒", color: "#E91E63", sort_order: 196608, is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "cat-bills", user_id: MOCK_USER_ID, parent_id: null, name: "Hóa đơn", name_vi: "Hóa đơn", type: "expense", icon: "", color: "#FFC107", sort_order: 262144, is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "cat-entertainment", user_id: MOCK_USER_ID, parent_id: null, name: "Giải trí", name_vi: "Giải trí", type: "expense", icon: "🎮", color: "#9C27B0", sort_order: 327680, is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "cat-health", user_id: MOCK_USER_ID, parent_id: null, name: "Sức khỏe", name_vi: "Sức khỏe", type: "expense", icon: "💊", color: "#00BCD4", sort_order: 393216, is_active: true, created_at: "2026-01-01T00:00:00Z" },
  // Income categories
  { id: "cat-salary", user_id: MOCK_USER_ID, parent_id: null, name: "Lương Full", name_vi: "Lương Full", type: "income", icon: "💰", color: "#4CAF50", sort_order: 1000000, is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "cat-freelance", user_id: MOCK_USER_ID, parent_id: null, name: "Lương Part", name_vi: "Lương Part", type: "income", icon: "💰", color: "#8BC34A", sort_order: 1065536, is_active: true, created_at: "2026-01-01T00:00:00Z" },
];

// ─── People ─────────────────────────────────────────────────
const mockPeople: Person[] = [
  { id: "per-tuntun", user_id: MOCK_USER_ID, name: "Tuntun", relationship: "Cá nhân", is_active: true, created_at: "2026-01-01T00:00:00Z" },
  { id: "per-nunu", user_id: MOCK_USER_ID, name: "Nunu", relationship: "Người yêu", is_active: true, created_at: "2026-01-01T00:00:00Z" },
];

// ─── Transactions ───────────────────────────────────────────
const mockTransactions: Transaction[] = [
  { id: "txn-1", user_id: MOCK_USER_ID, type: "income", amount: 25000000, category_id: "cat-salary", wallet_id: "wal-vcb", to_wallet_id: null, person_id: "per-tuntun", note: "August salary", date: "2026-08-01", source: "manual", attachment_url: null, created_at: "2026-08-01T00:00:00Z" },
  { id: "txn-2", user_id: MOCK_USER_ID, type: "expense", amount: 150000, category_id: "cat-food-meal", wallet_id: "wal-momo", to_wallet_id: null, person_id: "per-tuntun", note: "Lunch at office", date: "2026-08-05", source: "manual", attachment_url: null, created_at: "2026-08-05T00:00:00Z" },
  { id: "txn-3", user_id: MOCK_USER_ID, type: "expense", amount: 45000, category_id: "cat-food-drink", wallet_id: "wal-momo", to_wallet_id: null, person_id: "per-nunu", note: "Coffee with Nunu", date: "2026-08-06", source: "manual", attachment_url: null, created_at: "2026-08-06T00:00:00Z" },
  { id: "txn-4", user_id: MOCK_USER_ID, type: "expense", amount: 2000000, category_id: "cat-bills", wallet_id: "wal-vcb", to_wallet_id: null, person_id: "per-tuntun", note: "Monthly internet + phone", date: "2026-08-03", source: "manual", attachment_url: null, created_at: "2026-08-03T00:00:00Z" },
  { id: "txn-5", user_id: MOCK_USER_ID, type: "transfer", amount: 5000000, category_id: null, wallet_id: "wal-vcb", to_wallet_id: "wal-tikop", person_id: null, note: "Move to savings", date: "2026-08-02", source: "manual", attachment_url: null, created_at: "2026-08-02T00:00:00Z" },
  { id: "txn-6", user_id: MOCK_USER_ID, type: "expense", amount: 350000, category_id: "cat-transport", wallet_id: "wal-cash", to_wallet_id: null, person_id: "per-tuntun", note: "Grab rides this week", date: "2026-08-04", source: "manual", attachment_url: null, created_at: "2026-08-04T00:00:00Z" },
  { id: "txn-7", user_id: MOCK_USER_ID, type: "income", amount: 5000000, category_id: "cat-freelance", wallet_id: "wal-vcb", to_wallet_id: null, person_id: "per-tuntun", note: "Freelance project payment", date: "2026-08-07", source: "manual", attachment_url: null, created_at: "2026-08-07T00:00:00Z" },
];

// ─── Investment Accounts ────────────────────────────────────
// Starts empty (summary shows 0 until the user creates an account).
const mockInvestmentAccounts: InvestmentAccount[] = [];

// ─── Investment Transactions ────────────────────────────────
const mockInvestmentTransactions: InvestmentTransaction[] = [];

// ─── Helper: deep clone ─────────────────────────────────────
function clone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data));
}

// ─── Mock Supabase Client ───────────────────────────────────
export function createMockClient() {
  let nextId = 100;
  const genId = () => `mock-${++nextId}`;

  return {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: MOCK_USER_ID,
            email: "user@todoist.app",
          },
        },
        error: null,
      }),
      signInWithPassword: async () => ({
        data: { user: { id: MOCK_USER_ID, email: "user@todoist.app" } },
        error: null,
      }),
      signUp: async () => ({
        data: { user: { id: MOCK_USER_ID, email: "user@todoist.app" } },
        error: null,
      }),
      signOut: async () => ({ error: null }),
    },

    from: (table: string) => {
      const getStore = (): any[] => {
        switch (table) {
          case "projects": return mockProjects;
          case "sections": return mockSections;
          case "tasks": return mockTasks;
          case "labels": return mockLabels;
          case "comments": return mockComments;
          case "filters": return mockFilters;
          case "wallets": return mockWallets;
          case "expense_categories": return mockCategories;
          case "people": return mockPeople;
          case "transactions": return mockTransactions;
          case "investment_accounts": return mockInvestmentAccounts;
          case "investment_transactions": return mockInvestmentTransactions;
          default: return [];
        }
      };

      // Parse a PostgREST-style `.or()` condition string such as
      // "wallet_id.eq.X,to_wallet_id.eq.X" into a predicate. Supports the
      // comparison operators used anywhere in this codebase.
      const parseOrCondition = (condition: string) => {
        const terms = condition.split(",").map((term) => {
          const [column, operator, ...rest] = term.split(".");
          return { column, operator, value: rest.join(".") };
        });
        return (item: any) =>
          terms.some(({ column, operator, value }) => {
            const cell = item[column];
            switch (operator) {
              case "eq": return String(cell) === value;
              case "neq": return String(cell) !== value;
              case "lt": return cell !== null && cell !== undefined && cell < value;
              case "lte": return cell !== null && cell !== undefined && cell <= value;
              case "gt": return cell !== null && cell !== undefined && cell > value;
              case "gte": return cell !== null && cell !== undefined && cell >= value;
              case "is": return value === "null" ? cell === null : cell === value;
              default: return false;
            }
          });
      };

      // Build a chainable query that is also thenable
      const createQuery = (): any => {
        let filters: Array<{ key: string; value: any; op: string }> = [];
        let orPredicates: Array<(item: any) => boolean> = [];
        let orderByField = "";
        let orderByAsc = true;
        let limitCount = 0;
        let selectFields = "*";

        const execute = () => {
          let result = clone(getStore());

          // Apply filters
          for (const f of filters) {
            if (f.op === "eq") {
              result = result.filter((item: any) => item[f.key] === f.value);
            } else if (f.op === "is") {
              result = result.filter((item: any) => item[f.key] === f.value);
            } else if (f.op === "gte") {
              result = result.filter((item: any) => item[f.key] >= f.value);
            } else if (f.op === "not") {
              result = result.filter((item: any) => item[f.key] !== f.value);
            }
          }

          // Apply .or() predicates (each call ANDs with other filters,
          // matching PostgREST semantics).
          for (const predicate of orPredicates) {
            result = result.filter(predicate);
          }

          // Apply ordering
          if (orderByField) {
            result.sort((a: any, b: any) => {
              const aVal = a[orderByField];
              const bVal = b[orderByField];
              if (aVal === bVal) return 0;
              if (orderByAsc) return aVal < bVal ? -1 : 1;
              return aVal > bVal ? -1 : 1;
            });
          }

          // Apply limit
          if (limitCount > 0) result = result.slice(0, limitCount);

          return { data: result, error: null };
        };

        const query: any = {
          select: (fields: string = "*") => {
            selectFields = fields;
            return query;
          },
          eq: (key: string, value: any) => {
            filters.push({ key, value, op: "eq" });
            return query;
          },
          is: (key: string, value: any) => {
            filters.push({ key, value, op: "is" });
            return query;
          },
          or: (condition: string) => {
            orPredicates.push(parseOrCondition(condition));
            return query;
          },
          not: (key: string, _operator: string, value: any) => {
            filters.push({ key, value, op: "not" });
            return query;
          },
          gte: (key: string, value: any) => {
            filters.push({ key, value, op: "gte" });
            return query;
          },
          order: (field: string, opts?: { ascending?: boolean }) => {
            orderByField = field;
            orderByAsc = opts?.ascending ?? true;
            return query;
          },
          limit: (count: number) => {
            limitCount = count;
            return query;
          },
          single: async () => {
            const result = execute();
            if (result.data.length !== 1) {
              // Mirrors PostgREST PGRST116 so callers that verify the row
              // actually exists get a real error instead of silent nulls.
              return {
                data: null,
                error: {
                  message: "JSON object requested, multiple (or no) rows returned",
                  details: `Results contain ${result.data.length} rows`,
                  hint: "",
                  code: "PGRST116",
                },
              };
            }
            return { data: result.data[0], error: null };
          },
          maybeSingle: async () => {
            const result = execute();
            if (result.data.length > 1) {
              return {
                data: null,
                error: {
                  message: "JSON object requested, multiple (or no) rows returned",
                  details: `Results contain ${result.data.length} rows`,
                  hint: "",
                  code: "PGRST116",
                },
              };
            }
            return { data: result.data[0] ?? null, error: null };
          },
          insert: (data: any) => {
            const store = getStore();
            // Array-aware: supabase-js accepts a single object OR an array
            // for batch inserts. Push each row as its own record with a
            // unique id/created_at — spreading an array would otherwise
            // produce a malformed `{0: row0, ...}` object.
            const rows: any[] = Array.isArray(data) ? data : [data];
            const newItems = rows.map((row: any) => {
              const newItem = { ...row, id: genId(), created_at: new Date().toISOString() };
              store.push(newItem);
              return newItem;
            });
            // Chainable like supabase-js: `.insert(...).select().single()`.
            const insertChain: any = {
              select: (_fields: string = "*") => insertChain,
              single: async () => {
                if (newItems.length !== 1) {
                  return {
                    data: null,
                    error: {
                      message: "JSON object requested, multiple (or no) rows returned",
                      details: `Results contain ${newItems.length} rows`,
                      hint: "",
                      code: "PGRST116",
                    },
                  };
                }
                return { data: clone(newItems[0]), error: null };
              },
              then: (resolve: any) => resolve({ data: clone(newItems), error: null }),
            };
            return insertChain;
          },
          update: (data: any) => {
            const updateFilters: Array<{ key: string; value: any }> = [];
            const updateChain: any = {
              eq: (key: string, value: any) => {
                updateFilters.push({ key, value });
                return updateChain;
              },
              then: async (resolve: any) => {
                const store = getStore();
                const item = store.find((i: any) =>
                  updateFilters.every((f) => i[f.key] === f.value)
                );
                if (item) Object.assign(item, data);
                resolve({ data: item ? clone(item) : null, error: null });
              },
            };
            return updateChain;
          },
          delete: () => {
            const deleteFilters: Array<{ key: string; value: any }> = [];
            const deleteChain: any = {
              eq: (key: string, value: any) => {
                deleteFilters.push({ key, value });
                return deleteChain;
              },
              then: async (resolve: any) => {
                const store = getStore();
                const idx = store.findIndex((i: any) =>
                  deleteFilters.every((f) => i[f.key] === f.value)
                );
                if (idx >= 0) store.splice(idx, 1);
                resolve({ data: null, error: null });
              },
            };
            return deleteChain;
          },
          // Make the query thenable so `await supabase.from().select().eq()...` works
          then: (resolve: any, reject: any) => {
            resolve(execute());
          },
        };

        return query;
      };

      return createQuery();
    },
  };
}
