"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderTree, Users, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createWallet, deleteWallet, updateWallet } from "@/actions/wallets";
import {
  createCategory,
  deleteCategory,
  updateCategory,
} from "@/actions/categories";
import { createPerson, deletePerson, updatePerson } from "@/actions/people";
import type { ExpenseCategory, Person, Wallet } from "@/types/database";
import { ManageTabSection } from "./manage-tab-section";

interface ManageFinanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: Wallet[];
  categories: ExpenseCategory[];
  people: Person[];
  /** Keep the host's lifted option lists in sync with rows created here. */
  onWalletAdded: (wallet: Wallet) => void;
  onCategoryAdded: (category: ExpenseCategory) => void;
  onPersonAdded: (person: Person) => void;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

const WALLET_TYPE_LABELS: Record<Wallet["type"], string> = {
  cash: "Cash",
  bank: "Bank",
  ewallet: "E-wallet",
};

const WALLET_TYPE_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "ewallet", label: "E-wallet" },
];

const CATEGORY_TYPE_OPTIONS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
];

export function ManageFinanceDialog({
  open,
  onOpenChange,
  wallets,
  categories,
  people,
  onWalletAdded,
  onCategoryAdded,
  onPersonAdded,
}: ManageFinanceDialogProps) {
  const router = useRouter();

  const [walletList, setWalletList] = useState<Wallet[]>(wallets);
  const [categoryList, setCategoryList] = useState<ExpenseCategory[]>(categories);
  const [personList, setPersonList] = useState<Person[]>(people);

  // Create-row state per tab
  const [newWalletName, setNewWalletName] = useState("");
  const [newWalletType, setNewWalletType] = useState<Wallet["type"]>("cash");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<ExpenseCategory["type"]>("expense");
  const [newPersonName, setNewPersonName] = useState("");
  const [creating, setCreating] = useState(false);

  // Follow upstream props (e.g. after router.refresh()) without an effect:
  // compare against the previous props during render and reset when they change.
  const [prevWallets, setPrevWallets] = useState(wallets);
  const [prevCategories, setPrevCategories] = useState(categories);
  const [prevPeople, setPrevPeople] = useState(people);
  if (prevWallets !== wallets) {
    setPrevWallets(wallets);
    setWalletList(wallets);
  }
  if (prevCategories !== categories) {
    setPrevCategories(categories);
    setCategoryList(categories);
  }
  if (prevPeople !== people) {
    setPrevPeople(people);
    setPersonList(people);
  }

  // ── Wallets ──────────────────────────────────────────────────────────────

  const renameWallet = async (id: string, name: string) => {
    try {
      const fd = new FormData();
      fd.set("name", name);
      await updateWallet(id, fd);
      setWalletList((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)));
      toast.success("Wallet renamed");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to rename wallet"));
    }
  };

  const deactivateWallet = async (id: string) => {
    try {
      const fd = new FormData();
      fd.set("is_active", "false");
      await updateWallet(id, fd);
      setWalletList((prev) => prev.filter((w) => w.id !== id));
      toast.success("Wallet deactivated");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to deactivate wallet"));
    }
  };

  const removeWallet = async (id: string) => {
    try {
      const outcome = await deleteWallet(id);
      setWalletList((prev) => prev.filter((w) => w.id !== id));
      // deleteWallet distinguishes the two outcomes: a wallet referenced by
      // transactions is soft-deleted (history preserved), an unreferenced
      // one is hard-deleted.
      toast.success(
        outcome === "archived"
          ? "Wallet archived — transaction history kept"
          : "Wallet deleted"
      );
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete wallet"));
    }
  };

  const addWallet = async () => {
    const name = newWalletName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("type", newWalletType);
      const created = await createWallet(fd);
      setWalletList((prev) => [...prev, created]);
      onWalletAdded(created);
      setNewWalletName("");
      toast.success(`Wallet "${created.name}" created`);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to create wallet"));
    } finally {
      setCreating(false);
    }
  };

  // ── Categories ───────────────────────────────────────────────────────────

  const renameCategory = async (id: string, name: string) => {
    try {
      const fd = new FormData();
      fd.set("name", name);
      await updateCategory(id, fd);
      setCategoryList((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name } : c))
      );
      toast.success("Category renamed");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to rename category"));
    }
  };

  const deactivateCategory = async (id: string) => {
    try {
      const fd = new FormData();
      fd.set("is_active", "false");
      await updateCategory(id, fd);
      setCategoryList((prev) => prev.filter((c) => c.id !== id));
      toast.success("Category deactivated");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to deactivate category"));
    }
  };

  const removeCategory = async (id: string) => {
    try {
      await deleteCategory(id);
      setCategoryList((prev) => prev.filter((c) => c.id !== id));
      toast.success("Category deleted");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete category"));
    }
  };

  const addCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("type", newCategoryType);
      const created = await createCategory(fd);
      setCategoryList((prev) => [...prev, created]);
      onCategoryAdded(created);
      setNewCategoryName("");
      toast.success(`Category "${created.name}" created`);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to create category"));
    } finally {
      setCreating(false);
    }
  };

  // ── People ───────────────────────────────────────────────────────────────

  const renamePerson = async (id: string, name: string) => {
    try {
      const fd = new FormData();
      fd.set("name", name);
      await updatePerson(id, fd);
      setPersonList((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
      toast.success("Person renamed");
    } catch (err) {
      toast.error(errorMessage(err, "Failed to rename person"));
    }
  };

  const removePerson = async (id: string) => {
    try {
      await deletePerson(id);
      setPersonList((prev) => prev.filter((p) => p.id !== id));
      toast.success("Person deleted");
      router.refresh();
    } catch (err) {
      toast.error(errorMessage(err, "Failed to delete person"));
    }
  };

  const addPerson = async () => {
    const name = newPersonName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const fd = new FormData();
      fd.set("name", name);
      const created = await createPerson(fd);
      setPersonList((prev) => [...prev, created]);
      onPersonAdded(created);
      setNewPersonName("");
      toast.success(`Person "${created.name}" created`);
    } catch (err) {
      toast.error(errorMessage(err, "Failed to create person"));
    } finally {
      setCreating(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage wallets, categories &amp; people</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="wallets">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="wallets">Wallets</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
          </TabsList>

          <TabsContent value="wallets" className="mt-4">
            <ManageTabSection
              items={walletList}
              getMeta={(wallet) => WALLET_TYPE_LABELS[wallet.type]}
              emptyIcon={WalletIcon}
              emptyMessage="No wallets yet — add your first one below."
              onRename={renameWallet}
              onDelete={removeWallet}
              onDeactivate={deactivateWallet}
              newName={newWalletName}
              onNewNameChange={setNewWalletName}
              newPlaceholder="New wallet name"
              onAdd={() => void addWallet()}
              creating={creating}
              typeValue={newWalletType}
              onTypeChange={(v) => setNewWalletType(v as Wallet["type"])}
              typeOptions={WALLET_TYPE_OPTIONS}
            />
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <ManageTabSection
              items={categoryList}
              getMeta={(category) => (category.type === "income" ? "Income" : "Expense")}
              emptyIcon={FolderTree}
              emptyMessage="No categories yet — add your first one below."
              onRename={renameCategory}
              onDelete={removeCategory}
              onDeactivate={deactivateCategory}
              newName={newCategoryName}
              onNewNameChange={setNewCategoryName}
              newPlaceholder="New category name"
              onAdd={() => void addCategory()}
              creating={creating}
              typeValue={newCategoryType}
              onTypeChange={(v) => setNewCategoryType(v as ExpenseCategory["type"])}
              typeOptions={CATEGORY_TYPE_OPTIONS}
            />
          </TabsContent>

          <TabsContent value="people" className="mt-4">
            <ManageTabSection
              items={personList}
              getMeta={(person) => person.relationship ?? undefined}
              emptyIcon={Users}
              emptyMessage="No people yet — add your first one below."
              onRename={renamePerson}
              onDelete={removePerson}
              newName={newPersonName}
              onNewNameChange={setNewPersonName}
              newPlaceholder="New person name"
              onAdd={() => void addPerson()}
              creating={creating}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
