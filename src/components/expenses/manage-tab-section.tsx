"use client";

import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ManageRow } from "./manage-row";

export interface ManageTypeOption {
  value: string;
  label: string;
}

interface ManageTabSectionProps<TItem extends { id: string; name: string }> {
  items: TItem[];
  getMeta: (item: TItem) => string | undefined;
  emptyIcon: LucideIcon;
  emptyMessage: string;
  onRename: (id: string, name: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDeactivate?: (id: string) => Promise<void>;
  /** "Add new" footer state (controlled by the host dialog). */
  newName: string;
  onNewNameChange: (value: string) => void;
  newPlaceholder: string;
  onAdd: () => void;
  creating: boolean;
  /** Optional type picker shown in the add footer (wallets & categories). */
  typeValue?: string;
  onTypeChange?: (value: string) => void;
  typeOptions?: ManageTypeOption[];
}

/**
 * One tab of the manage dialog: scrollable renameable list with an
 * intentional empty state, plus the "add new" footer row.
 */
export function ManageTabSection<TItem extends { id: string; name: string }>({
  items,
  getMeta,
  emptyIcon: EmptyIcon,
  emptyMessage,
  onRename,
  onDelete,
  onDeactivate,
  newName,
  onNewNameChange,
  newPlaceholder,
  onAdd,
  creating,
  typeValue,
  onTypeChange,
  typeOptions,
}: ManageTabSectionProps<TItem>) {
  return (
    <div className="space-y-3">
      <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
        {items.map((item) => (
          <ManageRow
            key={item.id}
            name={item.name}
            meta={getMeta(item)}
            onRename={(name) => onRename(item.id, name)}
            onDelete={() => onDelete(item.id)}
            onDeactivate={onDeactivate ? () => onDeactivate(item.id) : undefined}
          />
        ))}
        {items.length === 0 && (
          <div className="flex flex-col items-center gap-1.5 py-8 text-center">
            <EmptyIcon className="h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 border-t pt-3">
        <Input
          value={newName}
          onChange={(e) => onNewNameChange(e.target.value)}
          placeholder={newPlaceholder}
          aria-label={newPlaceholder}
          className="h-8 text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAdd();
            }
          }}
        />
        {typeOptions && typeOptions.length > 0 && (
          <Select value={typeValue} onValueChange={onTypeChange}>
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          type="button"
          size="sm"
          onClick={onAdd}
          disabled={creating || !newName.trim()}
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          Add
        </Button>
      </div>
    </div>
  );
}
