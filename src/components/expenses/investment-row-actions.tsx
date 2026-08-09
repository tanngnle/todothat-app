"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InvestmentAccountDialog } from "@/components/expenses/investment-account-dialog";
import { InvestmentTransactionDialog } from "@/components/expenses/investment-transaction-dialog";
import {
  deleteInvestmentAccount,
  deleteInvestmentTransaction,
  getInvestmentAccounts,
  getInvestmentTransaction,
} from "@/actions/investments";
import type { InvestmentAccount } from "@/types/database";
import type { InvestmentTransactionWithAccount } from "@/actions/investments";

interface InvestmentsHeaderActionsProps {
  accounts: InvestmentAccount[];
}

export function InvestmentsHeaderActions({ accounts }: InvestmentsHeaderActionsProps) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [transactionOpen, setTransactionOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setTransactionOpen(true)}>
          Add transaction
        </Button>
        <Button size="sm" onClick={() => setAccountOpen(true)}>
          Add account
        </Button>
      </div>

      <InvestmentAccountDialog
        key={accountOpen ? "account-open" : "account-closed"}
        open={accountOpen}
        onOpenChange={setAccountOpen}
      />
      <InvestmentTransactionDialog
        key={transactionOpen ? "txn-open" : "txn-closed"}
        open={transactionOpen}
        onOpenChange={setTransactionOpen}
        accounts={accounts}
      />
    </>
  );
}

interface InvestmentAccountRowActionsProps {
  account: InvestmentAccount;
}

export function InvestmentAccountRowActions({ account }: InvestmentAccountRowActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteInvestmentAccount(account.id);
      toast.success("Account deleted");
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" aria-label="Account actions">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive dark:text-destructive-foreground dark:focus:text-destructive-foreground"
            onSelect={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InvestmentAccountDialog
        key={`edit-${account.id}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={account}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete account?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            &quot;{account.name}&quot; will be removed from your portfolio. Its
            transaction history is kept but will no longer appear.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface InvestmentTransactionRowActionsProps {
  transactionId: string;
  /**
   * Optional snapshot of the row; when omitted, the Edit flow fetches the
   * latest transaction + accounts from the server on demand.
   */
  transaction?: InvestmentTransactionWithAccount;
  accounts?: InvestmentAccount[];
}

export function InvestmentTransactionRowActions({
  transactionId,
  transaction,
  accounts,
}: InvestmentTransactionRowActionsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);
  const [editTransaction, setEditTransaction] =
    useState<InvestmentTransactionWithAccount | null>(null);
  const [editAccounts, setEditAccounts] = useState<InvestmentAccount[] | null>(
    accounts ?? null
  );

  const handleEdit = async () => {
    // Fast path: the caller already passed the row + accounts in.
    if (transaction && accounts) {
      setEditTransaction(transaction);
      setEditAccounts(accounts);
      setEditOpen(true);
      return;
    }
    setIsLoadingEdit(true);
    try {
      const [txn, accs] = await Promise.all([
        getInvestmentTransaction(transactionId),
        getInvestmentAccounts(),
      ]);
      if (!txn) {
        toast.error("Transaction no longer exists");
        return;
      }
      setEditTransaction(txn);
      setEditAccounts(accs);
      setEditOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoadingEdit(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteInvestmentTransaction(transactionId);
      toast.success("Transaction deleted");
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="Transaction actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={isLoadingEdit} onSelect={handleEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            {isLoadingEdit ? "Loading..." : "Edit"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive dark:text-destructive-foreground dark:focus:text-destructive-foreground"
            onSelect={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editTransaction && editAccounts && (
        <InvestmentTransactionDialog
          key={`edit-${transactionId}`}
          open={editOpen}
          onOpenChange={setEditOpen}
          accounts={editAccounts}
          initial={editTransaction}
        />
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete transaction?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This transaction will be permanently removed.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
