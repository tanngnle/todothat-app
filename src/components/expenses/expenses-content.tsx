"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import {
  ArrowLeftRight,
  Plus,
  Settings2,
  TrendingDown,
  TrendingUp,
  Wallet as WalletIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ExpenseCategory,
  Person,
  Transaction,
  Wallet,
} from "@/types/database";
import { exportExpensesToCSV } from "@/lib/utils/export";
import { ExportButton } from "@/components/shared/export-button";
import { formatVnd } from "@/lib/finance/money";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionRowActions } from "./transaction-row-actions";
import { ManageFinanceDialog } from "./manage-finance-dialog";
import { ImageImportDialog } from "./image-import-dialog";
import { BulkEntryPanel } from "./bulk-entry-panel";
import { CategoryBreakdown } from "./category-breakdown";

type ExpensesView = "all" | "income" | "expense" | "bulk";

interface ExpensesContentProps {
  /** Visible list (page caps it at 1000 rows). */
  transactions: Transaction[];
  /**
   * Unlimited set used for CSV export so exports never truncate.
   * Falls back to `transactions` when not provided.
   */
  exportTransactions?: Transaction[];
  categories: ExpenseCategory[];
  wallets: Wallet[];
  people: Person[];
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
}

export function ExpensesContent({
  transactions,
  exportTransactions,
  categories,
  wallets,
  people,
  totalIncome,
  totalExpense,
  totalBalance,
}: ExpensesContentProps) {
  const router = useRouter();

  // Lifted option lists — inline-created wallets/categories/people are appended
  // here so every dialog/select sees them without a page round-trip.
  const [walletOptions, setWalletOptions] = useState<Wallet[]>(wallets);
  const [categoryOptions, setCategoryOptions] = useState<ExpenseCategory[]>(categories);
  const [personOptions, setPersonOptions] = useState<Person[]>(people);

  // Follow upstream props (e.g. after router.refresh()) without an effect:
  // compare against the previous props during render and reset when they change.
  const [prevWallets, setPrevWallets] = useState(wallets);
  const [prevCategories, setPrevCategories] = useState(categories);
  const [prevPeople, setPrevPeople] = useState(people);
  if (prevWallets !== wallets) {
    setPrevWallets(wallets);
    setWalletOptions(wallets);
  }
  if (prevCategories !== categories) {
    setPrevCategories(categories);
    setCategoryOptions(categories);
  }
  if (prevPeople !== people) {
    setPrevPeople(people);
    setPersonOptions(people);
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [view, setView] = useState<ExpensesView>("all");

  const visibleTransactions = useMemo(() => {
    if (view === "income") return transactions.filter((t) => t.type === "income");
    if (view === "expense") return transactions.filter((t) => t.type === "expense");
    return transactions;
  }, [transactions, view]);

  const addWalletOption = (wallet: Wallet) =>
    setWalletOptions((prev) =>
      prev.some((w) => w.id === wallet.id) ? prev : [...prev, wallet]
    );
  const addCategoryOption = (category: ExpenseCategory) =>
    setCategoryOptions((prev) =>
      prev.some((c) => c.id === category.id) ? prev : [...prev, category]
    );
  const addPersonOption = (person: Person) =>
    setPersonOptions((prev) =>
      prev.some((p) => p.id === person.id) ? prev : [...prev, person]
    );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (transaction: Transaction) => {
    setEditing(transaction);
    setDialogOpen(true);
  };

  // Group transactions by date (newest first) — same rendering as before.
  const grouped = useMemo(() => {
    const groupedMap = new Map<string, Transaction[]>();
    for (const t of visibleTransactions) {
      const existing = groupedMap.get(t.date) || [];
      existing.push(t);
      groupedMap.set(t.date, existing);
    }
    return Array.from(groupedMap.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [visibleTransactions]);

  const getCategoryName = (id: string | null) =>
    categoryOptions.find((c) => c.id === id)?.name || "—";

  const getWalletName = (id: string | null) =>
    walletOptions.find((w) => w.id === id)?.name || "—";

  const handleExportExpenses = () => {
    // Export the unlimited set (when provided) — never the capped list.
    const exportData = (exportTransactions ?? transactions).map((txn) => ({
      ...txn,
      category_name: categories.find((c) => c.id === txn.category_id)?.name || "",
      wallet_name: wallets.find((w) => w.id === txn.wallet_id)?.name || "",
      to_wallet_name: wallets.find((w) => w.id === txn.to_wallet_id)?.name || "",
      person_name: people.find((p) => p.id === txn.person_id)?.name || "",
      note: txn.note || undefined,
    }));

    exportExpensesToCSV(exportData, `expenses_${new Date().toISOString().split("T")[0]}`);
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track your income and spending</p>
        </div>
        <div className="flex items-center gap-2">
          <ImageImportDialog
            wallets={walletOptions}
            categories={categoryOptions}
            onSaved={() => router.refresh()}
          />
          <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>
            <Settings2 className="mr-2 h-4 w-4" />
            Manage
          </Button>
          <ExportButton onExportExpenses={handleExportExpenses} />
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add transaction
          </Button>
        </div>
      </div>

      {/* Summary Cards — totals are computed SERVER-side in the page
          component (src/app/(app)/expenses/page.tsx) and passed down as
          props; the browser never recomputes them ("compute on server,
          not browser"). Kept exactly as-is. */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            Income
          </div>
          <p className="mt-1 text-xl font-bold tabular-nums text-green-600 dark:text-green-400">{formatVnd(totalIncome)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-destructive dark:text-destructive-foreground" />
            Expenses
          </div>
          <p className="mt-1 text-xl font-bold tabular-nums text-destructive dark:text-destructive-foreground">{formatVnd(totalExpense)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <WalletIcon className="h-4 w-4" />
            Balance
          </div>
          <p className="mt-1 text-xl font-bold tabular-nums text-foreground">{formatVnd(totalBalance)}</p>
        </div>
      </div>

      {/* Category breakdown widget — fetches /api/transactions and renders
          the server-computed per-category expense breakdown. */}
      <div className="mb-8">
        <CategoryBreakdown />
      </div>

      {/* View tabs (filter list views + bulk entry) */}
      <Tabs
        value={view}
        onValueChange={(value) => setView(value as ExpensesView)}
        className="mb-6"
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expense">Expense</TabsTrigger>
          <TabsTrigger value="bulk">Bulk add</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "bulk" ? (
        <BulkEntryPanel
          wallets={walletOptions}
          categories={categoryOptions}
          onSaved={() => {
            router.refresh();
            setView("all");
          }}
        />
      ) : (
      <>
      {/* Transactions List */}
      <div className="space-y-6">
        {grouped.map(([date, txns]) => (
          <div key={date}>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              {format(parseISO(date), "EEEE, MMMM d, yyyy")}
            </h3>
            <div className="space-y-1">
              {txns.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-card px-4 py-3 transition-colors hover:bg-accent/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {txn.type === "income" && <TrendingUp className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />}
                    {txn.type === "expense" && <TrendingDown className="h-4 w-4 shrink-0 text-destructive dark:text-destructive-foreground" />}
                    {txn.type === "transfer" && <ArrowLeftRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{getCategoryName(txn.category_id)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {getWalletName(txn.wallet_id)}
                        {txn.to_wallet_id && ` → ${getWalletName(txn.to_wallet_id)}`}
                        {txn.note && ` · ${txn.note}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        txn.type === "income"
                          ? "text-green-600 dark:text-green-400"
                          : txn.type === "expense"
                            ? "text-destructive dark:text-destructive-foreground"
                            : "text-foreground"
                      }`}
                    >
                      {txn.type === "income" ? "+" : txn.type === "expense" ? "-" : ""}
                      {formatVnd(Number(txn.amount))}
                    </span>
                    <TransactionRowActions transaction={txn} onEdit={openEdit} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {visibleTransactions.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <WalletIcon className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-1 text-lg font-medium">No transactions yet</h3>
            <p className="text-sm text-muted-foreground">
              Click &quot;Add transaction&quot; to start tracking your expenses.
            </p>
          </div>
        )}
      </div>
      </>
      )}

      {/* Dialogs */}
      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        wallets={walletOptions}
        categories={categoryOptions}
        people={personOptions}
        onWalletAdded={addWalletOption}
        onCategoryAdded={addCategoryOption}
        onPersonAdded={addPersonOption}
        onSaved={() => router.refresh()}
      />
      <ManageFinanceDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        wallets={walletOptions}
        categories={categoryOptions}
        people={personOptions}
        onWalletAdded={addWalletOption}
        onCategoryAdded={addCategoryOption}
        onPersonAdded={addPersonOption}
      />
    </div>
  );
}
