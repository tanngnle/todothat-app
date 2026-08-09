"use client";

import { useState } from "react";
import { Archive, Check, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ManageRowProps {
  name: string;
  meta?: string;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onDeactivate?: () => Promise<void>;
}

/** Inline-renameable list row used by the manage wallets/categories/people dialog. */
export function ManageRow({ name, meta, onRename, onDelete, onDeactivate }: ManageRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === name) {
      setEditing(false);
      setDraft(name);
      return;
    }
    setBusy(true);
    try {
      await onRename(trimmed);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1.5 rounded-md border bg-card px-2 py-1.5">
        <Input
          autoFocus
          aria-label={`Rename ${name}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            } else if (e.key === "Escape") {
              setDraft(name);
              setEditing(false);
            }
          }}
          className="h-7 text-sm"
          disabled={busy}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Save name"
          onClick={() => void save()}
          disabled={busy || !draft.trim()}
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Cancel rename"
          onClick={() => {
            setDraft(name);
            setEditing(false);
          }}
          disabled={busy}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group flex items-center justify-between rounded-md border bg-card px-3 py-2 transition-colors hover:bg-accent/40">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{name}</p>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          aria-label={`Rename ${name}`}
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {onDeactivate && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label={`Deactivate ${name}`}
            title="Deactivate"
            onClick={() => void onDeactivate()}
          >
            <Archive className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive dark:hover:text-destructive-foreground"
          aria-label={`Delete ${name}`}
          title="Delete"
          onClick={() => void onDelete()}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
