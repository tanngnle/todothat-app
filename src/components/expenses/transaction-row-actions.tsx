"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MoreHorizontal, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteTransaction } from "@/actions/transactions";
import type { Transaction } from "@/types/database";

interface TransactionRowActionsProps {
  transaction: Transaction;
  /** Opens the transaction dialog prefilled with this row. */
  onEdit: (transaction: Transaction) => void;
}

export function TransactionRowActions({
  transaction,
  onEdit,
}: TransactionRowActionsProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTransaction(transaction.id);
      toast.success("Transaction deleted");
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete transaction"
      );
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (!open) setConfirming(false);
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          aria-label="Transaction actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {!confirming ? (
          <>
            <DropdownMenuItem onSelect={() => onEdit(transaction)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive dark:text-destructive-foreground dark:focus:text-destructive-foreground"
              onSelect={(e) => {
                e.preventDefault();
                setConfirming(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              Delete this transaction? Wallet balances will be reverted.
            </p>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive dark:text-destructive-foreground dark:focus:text-destructive-foreground"
              disabled={deleting}
              onSelect={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
            >
              <Check className="mr-2 h-4 w-4" />
              {deleting ? "Deleting…" : "Confirm delete"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setConfirming(false);
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
