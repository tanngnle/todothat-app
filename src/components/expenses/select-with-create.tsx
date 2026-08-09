"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface SelectOption {
  id: string;
  name: string;
}

interface SelectWithCreateProps<TOption extends SelectOption> {
  label: string;
  options: TOption[];
  value: string;
  onChange: (id: string) => void;
  /** Create action (createWallet / createCategory / createPerson) returning the inserted row. */
  createAction: (formData: FormData) => Promise<TOption>;
  /** Called with the newly created row so the parent can lift it into its options state. */
  onOptionAdded?: (option: TOption) => void;
  /** Extra FormData fields required by the create action (e.g. wallet type, category type). */
  extraFields?: Record<string, string>;
  placeholder?: string;
  optional?: boolean;
}

/**
 * Shadcn Select with an inline "+ Add new" affordance. Creating a new option
 * calls the server action, appends the returned row (no page round-trip) and
 * selects it immediately.
 */
export function SelectWithCreate<TOption extends SelectOption>({
  label,
  options,
  value,
  onChange,
  createAction,
  onOptionAdded,
  extraFields,
  placeholder = "Select...",
  optional = false,
}: SelectWithCreateProps<TOption>) {
  const [localOptions, setLocalOptions] = useState<TOption[]>(options);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // Merge upstream options with anything created inline this session.
  // Done during render via a prev-prop comparison instead of an effect.
  const [prevOptions, setPrevOptions] = useState(options);
  if (prevOptions !== options) {
    setPrevOptions(options);
    setLocalOptions((prev) => {
      const known = new Set(options.map((o) => o.id));
      const extras = prev.filter((o) => !known.has(o.id));
      return extras.length > 0 ? [...options, ...extras] : options;
    });
  }

  const cancelAdd = () => {
    setAdding(false);
    setNewName("");
  };

  const confirmAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const formData = new FormData();
      formData.set("name", name);
      if (extraFields) {
        for (const [key, fieldValue] of Object.entries(extraFields)) {
          formData.set(key, fieldValue);
        }
      }
      const created = await createAction(formData);
      setLocalOptions((prev) =>
        prev.some((o) => o.id === created.id) ? prev : [...prev, created]
      );
      onOptionAdded?.(created);
      onChange(created.id);
      cancelAdd();
      toast.success(`${label} "${created.name}" created`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to create ${label.toLowerCase()}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium text-muted-foreground">
          {label}
          {optional && <span className="font-normal"> (optional)</span>}
        </Label>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-0.5 rounded-sm text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus className="h-3 w-3" />
            Add new
          </button>
        )}
      </div>

      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {localOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {adding && (
        <div className="flex items-center gap-1.5">
          <Input
            autoFocus
            aria-label={`New ${label.toLowerCase()} name`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void confirmAdd();
              } else if (e.key === "Escape") {
                cancelAdd();
              }
            }}
            placeholder={`New ${label.toLowerCase()} name`}
            className="h-8 text-sm"
            disabled={creating}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label={`Add ${label.toLowerCase()}`}
            onClick={() => void confirmAdd()}
            disabled={creating || !newName.trim()}
          >
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            aria-label="Cancel"
            onClick={cancelAdd}
            disabled={creating}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
