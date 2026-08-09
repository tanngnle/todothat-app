"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createTransaction, updateTransaction } from "@/actions/transactions";
import { createWallet } from "@/actions/wallets";
import { createCategory } from "@/actions/categories";
import { createPerson } from "@/actions/people";
import { toIntegerVnd } from "@/lib/finance/money";
import { todayLocalISO } from "@/lib/finance/dates";
import type {
  ExpenseCategory,
  Person,
  Transaction,
  Wallet,
} from "@/types/database";
import { SelectWithCreate } from "./select-with-create";

type TransactionType = Transaction["type"];

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this transaction; otherwise it creates one. */
  initial?: Transaction | null;
  wallets: Wallet[];
  categories: ExpenseCategory[];
  people: Person[];
  /** Lifted option-state callbacks so inline-created rows stay available app-wide. */
  onWalletAdded: (wallet: Wallet) => void;
  onCategoryAdded: (category: ExpenseCategory) => void;
  onPersonAdded: (person: Person) => void;
  /** Called after a successful create/update (host typically router.refresh()s). */
  onSaved?: () => void;
}

export function TransactionDialog({
  open,
  onOpenChange,
  initial,
  wallets,
  categories,
  people,
  onWalletAdded,
  onCategoryAdded,
  onPersonAdded,
  onSaved,
}: TransactionDialogProps) {
  const isEdit = Boolean(initial);

  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [walletId, setWalletId] = useState("");
  const [toWalletId, setToWalletId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [personId, setPersonId] = useState("");
  const [date, setDate] = useState(todayLocalISO());
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // (Re)seed the controlled state every time the dialog opens.
  // Done during render via a prev-prop comparison instead of an effect.
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setSubmitting(false);
      if (initial) {
        setType(initial.type);
        setAmount(String(Number(initial.amount)));
        setWalletId(initial.wallet_id ?? "");
        setToWalletId(initial.to_wallet_id ?? "");
        setCategoryId(initial.category_id ?? "");
        setPersonId(initial.person_id ?? "");
        setDate(initial.date);
        setNote(initial.note ?? "");
      } else {
        setType("expense");
        setAmount("");
        setWalletId("");
        setToWalletId("");
        setCategoryId("");
        setPersonId("");
        setDate(todayLocalISO());
        setNote("");
      }
    }
  }

  const categoryOptions =
    type === "transfer" ? [] : categories.filter((c) => c.type === type);

  const handleTypeChange = (value: string) => {
    const next = value as TransactionType;
    setType(next);
    // Categories are type-scoped; transfers have neither category nor person.
    setCategoryId("");
    if (next === "transfer") {
      setPersonId("");
    } else {
      setToWalletId("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let parsedAmount: number;
    try {
      parsedAmount = toIntegerVnd(amount);
    } catch {
      toast.error("Amount must be a positive whole number (VND)");
      return;
    }
    if (parsedAmount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    if (!walletId) {
      toast.error("Choose a wallet");
      return;
    }
    if (type === "transfer") {
      if (!toWalletId) {
        toast.error("Choose a destination wallet");
        return;
      }
      if (toWalletId === walletId) {
        toast.error("Destination wallet must differ from the source wallet");
        return;
      }
    }

    const formData = new FormData();
    formData.set("type", type);
    formData.set("amount", String(parsedAmount));
    formData.set("wallet_id", walletId);
    if (type === "transfer") {
      formData.set("to_wallet_id", toWalletId);
    } else {
      if (categoryId) formData.set("category_id", categoryId);
      if (personId) formData.set("person_id", personId);
    }
    formData.set("date", date || todayLocalISO());
    if (note.trim()) formData.set("note", note.trim());

    setSubmitting(true);
    try {
      const result = initial
        ? await updateTransaction(initial.id, formData)
        : await createTransaction(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success(isEdit ? "Transaction updated" : "Transaction added");
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save transaction");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit transaction" : "Add transaction"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-amount" className="text-xs font-medium text-muted-foreground">Amount (VND)</Label>
              <Input
                id="txn-amount"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="h-9 text-right tabular-nums"
              />
            </div>
          </div>

          <SelectWithCreate
            label="Wallet"
            options={wallets}
            value={walletId}
            onChange={setWalletId}
            createAction={createWallet}
            onOptionAdded={onWalletAdded}
            extraFields={{ type: "cash" }}
            placeholder="Select wallet"
          />

          {type === "transfer" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">To wallet</Label>
              <Select value={toWalletId || undefined} onValueChange={setToWalletId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Destination wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets
                    .filter((w) => w.id !== walletId)
                    .map((w) => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type !== "transfer" && (
            <>
              <SelectWithCreate
                label="Category"
                options={categoryOptions}
                value={categoryId}
                onChange={setCategoryId}
                createAction={createCategory}
                onOptionAdded={onCategoryAdded}
                extraFields={{ type }}
                placeholder="Select category"
                optional
              />

              <SelectWithCreate
                label="Person"
                options={people}
                value={personId}
                onChange={setPersonId}
                createAction={createPerson}
                onOptionAdded={onPersonAdded}
                placeholder="Select person"
                optional
              />
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="txn-date" className="text-xs font-medium text-muted-foreground">Date</Label>
              <Input
                id="txn-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="txn-note" className="text-xs font-medium text-muted-foreground">Note</Label>
              <Input
                id="txn-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note..."
                className="h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Add transaction"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
