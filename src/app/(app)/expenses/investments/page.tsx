import {
  getInvestmentAccounts,
  getInvestmentTransactions,
  type InvestmentTransactionWithAccount,
} from "@/actions/investments";
import {
  InvestmentAccountRowActions,
  InvestmentTransactionRowActions,
  InvestmentsHeaderActions,
} from "@/components/expenses/investment-row-actions";
import { formatVnd } from "@/lib/finance/money";
import { TrendingUp, TrendingDown, DollarSign, Landmark, ReceiptText } from "lucide-react";
import type { InvestmentAccount } from "@/types/database";

const TYPE_LABELS: Record<string, string> = {
  buy: "Buy",
  sell: "Sell",
  profit: "Profit",
  loss: "Loss",
};

export default async function InvestmentsPage() {
  const accounts = await getInvestmentAccounts();
  const transactions = await getInvestmentTransactions();

  const totalInvested = accounts.reduce(
    (sum: number, a: InvestmentAccount) => sum + Number(a.invested),
    0
  );
  const totalBalance = accounts.reduce(
    (sum: number, a: InvestmentAccount) => sum + Number(a.balance),
    0
  );
  const totalPL = totalBalance - totalInvested;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Investments</h1>
          <p className="text-sm text-muted-foreground">Track your investment portfolio</p>
        </div>
        <InvestmentsHeaderActions accounts={accounts} />
      </div>

      {/* Summary */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Invested</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatVnd(totalInvested)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Current value</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{formatVnd(totalBalance)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Profit / Loss</p>
          <p className={`mt-1 text-xl font-bold tabular-nums ${totalPL >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive dark:text-destructive-foreground"}`}>
            {totalPL >= 0 ? "+" : ""}{formatVnd(totalPL)}
          </p>
        </div>
      </div>

      {/* Accounts */}
      <h2 className="mb-3 text-sm font-semibold">Accounts</h2>
      <div className="mb-8 grid grid-cols-2 gap-3">
        {accounts.map((account) => (
          <div key={account.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{account.name}</p>
              <div className="flex items-center gap-1">
                <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">{account.platform}</span>
                <InvestmentAccountRowActions account={account} />
              </div>
            </div>
            <p className="mt-2 text-sm tabular-nums text-muted-foreground">Invested: {formatVnd(Number(account.invested))}</p>
            <p className="text-sm tabular-nums text-muted-foreground">Value: {formatVnd(Number(account.balance))}</p>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-2 flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
            <Landmark className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No investment accounts yet</p>
            <p className="text-xs text-muted-foreground">Click &quot;Add account&quot; to start tracking your portfolio.</p>
          </div>
        )}
      </div>

      {/* Transactions */}
      <h2 className="mb-3 text-sm font-semibold">Recent transactions</h2>
      <div className="space-y-2">
        {transactions.map((txn: InvestmentTransactionWithAccount) => (
          <div key={txn.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              {txn.type === "buy" && <TrendingUp className="h-4 w-4 shrink-0 text-muted-foreground" />}
              {txn.type === "sell" && <TrendingDown className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />}
              {txn.type === "profit" && <DollarSign className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />}
              {txn.type === "loss" && <TrendingDown className="h-4 w-4 shrink-0 text-destructive dark:text-destructive-foreground" />}
              <div>
                <p className="text-sm font-medium">{txn.investment_accounts?.name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">{TYPE_LABELS[txn.type] ?? txn.type} · {txn.date}{txn.note && ` · ${txn.note}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold tabular-nums ${
                txn.type === "profit" ? "text-green-600 dark:text-green-400" :
                txn.type === "loss" ? "text-destructive dark:text-destructive-foreground" : "text-foreground"
              }`}>
                {formatVnd(Number(txn.amount))}
              </span>
              <InvestmentTransactionRowActions transactionId={txn.id} />
            </div>
          </div>
        ))}
        {transactions.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
            <ReceiptText className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No investment transactions yet</p>
            <p className="text-xs text-muted-foreground">Add an account, then record your first buy or sell.</p>
          </div>
        )}
      </div>
    </div>
  );
}
