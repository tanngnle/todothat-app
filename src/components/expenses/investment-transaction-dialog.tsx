"use client";

import { useState } from "react";
import { Landmark } from "lucide-react";
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
import {
  createInvestmentTransaction,
  updateInvestmentTransaction,
} from "@/actions/investments";
import { todayLocalISO } from "@/lib/finance/dates";
import type { InvestmentAccount, InvestmentTransaction } from "@/types/database";

const TRANSACTION_TYPES = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "profit", label: "Profit" },
  { value: "loss", label: "Loss" },
] as const;

interface InvestmentTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: InvestmentAccount[];
  defaultAccountId?: string;
  /** When provided, the dialog switches to edit mode and prefills fields. */
  initial?: InvestmentTransaction;
}

export function InvestmentTransactionDialog({
  open,
  onOpenChange,
  accounts,
  defaultAccountId,
  initial,
}: InvestmentTransactionDialogProps) {
  const isEdit = Boolean(initial);
  const [accountId, setAccountId] = useState(
    initial?.account_id ?? defaultAccountId ?? accounts[0]?.id ?? ""
  );
  const [type, setType] = useState<string>(initial?.type ?? "buy");
  const [amount, setAmount] = useState(
    initial ? String(initial.amount) : ""
  );
  const [date, setDate] = useState(initial?.date ?? todayLocalISO());
  const [note, setNote] = useState(initial?.note ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !amount.trim()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("account_id", accountId);
      formData.set("type", type);
      formData.set("amount", amount.trim());
      formData.set("date", date);
      formData.set("note", note.trim());

      if (isEdit && initial) {
        await updateInvestmentTransaction(initial.id, formData);
        toast.success("Transaction updated");
      } else {
        await createInvestmentTransaction(formData);
        toast.success("Transaction added");
        setAmount("");
        setNote("");
      }

      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit investment transaction" : "Add investment transaction"}
          </DialogTitle>
        </DialogHeader>
        {accounts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Landmark className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium">No investment accounts yet</p>
            <p className="text-xs text-muted-foreground">
              Create an investment account first, then add transactions to it.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="inv-txn-account" className="text-xs font-medium text-muted-foreground">Account</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger id="inv-txn-account">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} · {account.platform}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-txn-type" className="text-xs font-medium text-muted-foreground">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="inv-txn-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSACTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv-txn-amount" className="text-xs font-medium text-muted-foreground">Amount (VND)</Label>
                <Input
                  id="inv-txn-amount"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="text-right tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inv-txn-date" className="text-xs font-medium text-muted-foreground">Date</Label>
                <Input
                  id="inv-txn-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-txn-note" className="text-xs font-medium text-muted-foreground">Note</Label>
              <Input
                id="inv-txn-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Bought FPT (optional)"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !accountId || !amount.trim()}>
                {isSubmitting
                  ? isEdit
                    ? "Saving..."
                    : "Adding..."
                  : isEdit
                    ? "Save changes"
                    : "Add transaction"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
