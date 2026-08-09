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
  createInvestmentAccount,
  updateInvestmentAccount,
} from "@/actions/investments";
import type { InvestmentAccount } from "@/types/database";

interface InvestmentAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: InvestmentAccount;
}

export function InvestmentAccountDialog({
  open,
  onOpenChange,
  initial,
}: InvestmentAccountDialogProps) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [platform, setPlatform] = useState(initial?.platform ?? "");
  const [type, setType] = useState(initial?.type ?? "");
  const [balance, setBalance] = useState(initial ? String(initial.balance) : "");
  const [invested, setInvested] = useState(initial ? String(initial.invested) : "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !platform.trim()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("platform", platform.trim());
      formData.set("type", type.trim());
      formData.set("balance", balance.trim() || "0");
      formData.set("invested", invested.trim() || "0");

      if (isEdit && initial) {
        await updateInvestmentAccount(initial.id, formData);
        toast.success("Account updated");
      } else {
        await createInvestmentAccount(formData);
        toast.success("Account created");
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
          <DialogTitle>{isEdit ? "Edit account" : "Add investment account"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="inv-account-name" className="text-xs font-medium text-muted-foreground">Name</Label>
            <Input
              id="inv-account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My stock portfolio"
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-account-platform" className="text-xs font-medium text-muted-foreground">Platform / Broker</Label>
            <Input
              id="inv-account-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="e.g. TCBS, SSI, VNDirect"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inv-account-type" className="text-xs font-medium text-muted-foreground">Type</Label>
            <Input
              id="inv-account-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="e.g. stocks, funds, crypto (optional)"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="inv-account-invested" className="text-xs font-medium text-muted-foreground">Invested (VND)</Label>
              <Input
                id="inv-account-invested"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={invested}
                onChange={(e) => setInvested(e.target.value)}
                placeholder="0"
                className="text-right tabular-nums"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inv-account-balance" className="text-xs font-medium text-muted-foreground">Current value (VND)</Label>
              <Input
                id="inv-account-balance"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="0"
                className="text-right tabular-nums"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !name.trim() || !platform.trim()}
            >
              {isSubmitting ? "Saving..." : isEdit ? "Save changes" : "Add account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
