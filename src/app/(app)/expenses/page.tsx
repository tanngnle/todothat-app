import { getTransactions } from "@/actions/transactions";
import { getCategories } from "@/actions/categories";
import { getWallets } from "@/actions/wallets";
import { getPeople } from "@/actions/people";
import { createTransaction, deleteTransaction } from "@/actions/transactions";
import { Wallet, TrendingUp, TrendingDown, ArrowLeftRight } from "lucide-react";
import { format } from "date-fns";
import { ExpensesContent } from "@/components/expenses/expenses-content";

export default async function ExpensesPage() {
  const transactions = await getTransactions();
  const categories = await getCategories();
  const wallets = await getWallets();
  const people = await getPeople();

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

  // Group by date
  const groupedMap = new Map<string, typeof transactions>();
  for (const t of transactions) {
    const existing = groupedMap.get(t.date) || [];
    existing.push(t);
    groupedMap.set(t.date, existing);
  }
  const grouped = Array.from(groupedMap.entries()).sort(([a], [b]) => b.localeCompare(a));

  const formatVND = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  const getCategoryName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name || "—";

  const getWalletName = (id: string | null) =>
    wallets.find((w) => w.id === id)?.name || "—";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <ExpensesContent
        transactions={transactions}
        categories={categories}
        wallets={wallets}
        people={people}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        totalBalance={totalBalance}
      />

      {/* Summary Cards */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-green-500" />
            Income
          </div>
          <p className="mt-1 text-xl font-bold text-green-600">{formatVND(totalIncome)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-red-500" />
            Expenses
          </div>
          <p className="mt-1 text-xl font-bold text-red-600">{formatVND(totalExpense)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4 text-blue-500" />
            Total Balance
          </div>
          <p className="mt-1 text-xl font-bold text-foreground">{formatVND(totalBalance)}</p>
        </div>
      </div>

      {/* Add Transaction Form */}
      <div className="mb-8 rounded-lg border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Add Transaction</h3>
        <form action={createTransaction} className="grid grid-cols-2 gap-3">
          <select name="type" className="rounded border bg-background px-3 py-2 text-sm" defaultValue="expense">
            <option value="expense">Expense</option>
            <option value="income">Income</option>
            <option value="transfer">Transfer</option>
          </select>
          <input name="amount" type="number" placeholder="Amount (VND)" required className="rounded border bg-background px-3 py-2 text-sm" />
          <select name="wallet_id" className="rounded border bg-background px-3 py-2 text-sm" required>
            <option value="">Select wallet...</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <select name="category_id" className="rounded border bg-background px-3 py-2 text-sm">
            <option value="">Select category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input name="date" type="date" defaultValue={new Date().toISOString().split("T")[0]} className="rounded border bg-background px-3 py-2 text-sm" />
          <input name="note" placeholder="Note..." className="rounded border bg-background px-3 py-2 text-sm" />
          <button type="submit" className="col-span-2 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            Add Transaction
          </button>
        </form>
      </div>

      {/* Transactions List */}
      <div className="space-y-6">
        {grouped.map(([date, txns]) => (
          <div key={date}>
            <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              {format(new Date(date), "EEEE, MMMM d, yyyy")}
            </h3>
            <div className="space-y-1">
              {(txns as typeof transactions).map((txn) => (
                <div key={txn.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
                  <div className="flex items-center gap-3">
                    {txn.type === "income" && <TrendingUp className="h-4 w-4 text-green-500" />}
                    {txn.type === "expense" && <TrendingDown className="h-4 w-4 text-red-500" />}
                    {txn.type === "transfer" && <ArrowLeftRight className="h-4 w-4 text-blue-500" />}
                    <div>
                      <p className="text-sm font-medium">{getCategoryName(txn.category_id)}</p>
                      <p className="text-xs text-muted-foreground">
                        {getWalletName(txn.wallet_id)}
                        {txn.to_wallet_id && ` → ${getWalletName(txn.to_wallet_id)}`}
                        {txn.note && ` · ${txn.note}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-semibold ${
                    txn.type === "income" ? "text-green-600" :
                    txn.type === "expense" ? "text-red-600" : "text-blue-600"
                  }`}>
                    {txn.type === "income" ? "+" : txn.type === "expense" ? "-" : ""}
                    {formatVND(Number(txn.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {transactions.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16">
            <Wallet className="mb-4 h-12 w-12 text-muted-foreground/50" />
            <h3 className="mb-1 text-lg font-medium">No transactions yet</h3>
            <p className="text-sm text-muted-foreground">Start tracking your expenses above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
