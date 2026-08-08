"use client";

import { Transaction, ExpenseCategory, Wallet, Person } from "@/types/database";
import { exportExpensesToCSV } from "@/lib/utils/export";
import { ExportButton } from "@/components/shared/export-button";

interface ExpensesContentProps {
  transactions: Transaction[];
  categories: ExpenseCategory[];
  wallets: Wallet[];
  people: Person[];
  totalIncome: number;
  totalExpense: number;
  totalBalance: number;
}

export function ExpensesContent({
  transactions,
  categories,
  wallets,
  people,
  totalIncome,
  totalExpense,
  totalBalance,
}: ExpensesContentProps) {
  const handleExportExpenses = () => {
    const exportData = transactions.map((txn) => ({
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
    <div className="mb-8 flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Expenses</h1>
        <p className="text-sm text-muted-foreground">Track your income and spending</p>
      </div>
      <ExportButton onExportExpenses={handleExportExpenses} />
    </div>
  );
}
