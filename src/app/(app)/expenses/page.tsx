import { getTransactions } from "@/actions/transactions";
import { getCategories } from "@/actions/categories";
import { getWallets } from "@/actions/wallets";
import { getPeople } from "@/actions/people";
import { ExpensesContent } from "@/components/expenses/expenses-content";

export default async function ExpensesPage() {
  // Fetch the UNLIMITED set once (limit = null): summary totals and CSV
  // export must see every row. The visible list is capped at 1000 below.
  const [allTransactions, categories, wallets, people] = await Promise.all([
    getTransactions(undefined, undefined, null),
    getCategories(),
    getWallets(),
    getPeople(),
  ]);

  const transactions = allTransactions.slice(0, 1000);

  const totalIncome = allTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = allTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

  return (
    <ExpensesContent
      transactions={transactions}
      exportTransactions={allTransactions}
      categories={categories}
      wallets={wallets}
      people={people}
      totalIncome={totalIncome}
      totalExpense={totalExpense}
      totalBalance={totalBalance}
    />
  );
}
