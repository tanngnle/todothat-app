import { getInvestmentAccounts, getInvestmentTransactions } from "@/actions/investments";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

export default async function InvestmentsPage() {
  const accounts = await getInvestmentAccounts();
  const transactions = await getInvestmentTransactions();

  const totalInvested = accounts.reduce((sum: number, a: any) => sum + Number(a.invested), 0);
  const totalBalance = accounts.reduce((sum: number, a: any) => sum + Number(a.balance), 0);
  const totalPL = totalBalance - totalInvested;

  const formatVND = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Investments</h1>
        <p className="text-sm text-muted-foreground">Track your investment portfolio</p>
      </div>

      {/* Summary */}
      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Invested</p>
          <p className="mt-1 text-xl font-bold">{formatVND(totalInvested)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Current Value</p>
          <p className="mt-1 text-xl font-bold">{formatVND(totalBalance)}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Profit / Loss</p>
          <p className={`mt-1 text-xl font-bold ${totalPL >= 0 ? "text-green-600" : "text-red-600"}`}>
            {totalPL >= 0 ? "+" : ""}{formatVND(totalPL)}
          </p>
        </div>
      </div>

      {/* Accounts */}
      <h2 className="mb-3 text-sm font-semibold">Accounts</h2>
      <div className="mb-8 grid grid-cols-2 gap-3">
        {accounts.map((account: any) => (
          <div key={account.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium">{account.name}</p>
              <span className="rounded bg-muted px-2 py-0.5 text-xs">{account.platform}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Invested: {formatVND(Number(account.invested))}</p>
            <p className="text-sm text-muted-foreground">Value: {formatVND(Number(account.balance))}</p>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">No investment accounts yet</p>
        )}
      </div>

      {/* Transactions */}
      <h2 className="mb-3 text-sm font-semibold">Recent Transactions</h2>
      <div className="space-y-2">
        {transactions.map((txn: any) => (
          <div key={txn.id} className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              {txn.type === "buy" && <TrendingUp className="h-4 w-4 text-blue-500" />}
              {txn.type === "sell" && <TrendingDown className="h-4 w-4 text-orange-500" />}
              {txn.type === "profit" && <DollarSign className="h-4 w-4 text-green-500" />}
              {txn.type === "loss" && <TrendingDown className="h-4 w-4 text-red-500" />}
              <div>
                <p className="text-sm font-medium">{txn.investment_accounts?.name || "Unknown"}</p>
                <p className="text-xs text-muted-foreground">{txn.type} · {txn.date}{txn.note && ` · ${txn.note}`}</p>
              </div>
            </div>
            <span className={`text-sm font-semibold ${
              txn.type === "profit" ? "text-green-600" :
              txn.type === "loss" ? "text-red-600" : "text-foreground"
            }`}>
              {formatVND(Number(txn.amount))}
            </span>
          </div>
        ))}
        {transactions.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No investment transactions yet</p>
        )}
      </div>
    </div>
  );
}
