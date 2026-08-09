"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  LayoutList,
  LayoutGrid,
  CalendarDays,
  ChevronDown,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useDisplayOptions,
  defaultDisplayOptions,
  isModifiedOptions,
} from "@/components/providers/display-provider";
import type {
  LayoutView,
  GroupingOption,
  SortingOption,
  DateFilter,
  PriorityFilter,
} from "@/components/providers/display-provider";

const layoutOptions: { value: LayoutView; label: string; icon: React.ReactNode }[] = [
  { value: "list", label: "List", icon: <LayoutList className="h-4 w-4" /> },
  { value: "board", label: "Board", icon: <LayoutGrid className="h-4 w-4" /> },
  { value: "calendar", label: "Calendar", icon: <CalendarDays className="h-4 w-4" /> },
];

const groupingOptions: { value: GroupingOption; label: string }[] = [
  { value: "none", label: "None" },
  { value: "priority", label: "Priority" },
  { value: "due_date", label: "Due date" },
  { value: "label", label: "Label" },
  { value: "project", label: "Project" },
];

const sortingOptions: { value: SortingOption; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "due_date", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "created_date", label: "Date added" },
];

const dateFilterOptions: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "overdue", label: "Overdue" },
  { value: "this_week", label: "This week" },
  { value: "next_week", label: "Next week" },
  { value: "no_date", label: "No date" },
];

const priorityFilterOptions: { value: PriorityFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "p1", label: "P1" },
  { value: "p2", label: "P2" },
  { value: "p3", label: "P3" },
  { value: "p4", label: "P4" },
];

function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t">
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-foreground hover:bg-accent/50"
      >
        <span className="flex items-center">
          {title}
          {badge != null && badge > 0 && (
            <span className="ml-1.5 rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground">
              {badge}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>
      {isOpen && <div className="px-3 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

export function DisplayMenu({ trigger }: { trigger: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const {
    options,
    setLayout,
    setShowCompleted,
    setGrouping,
    setSorting,
    setDateFilter,
    setPriorityFilter,
    resetOptions,
  } = useDisplayOptions();

  const isModified = isModifiedOptions(options);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Element | null;
      if (
        target &&
        typeof target.closest === "function" &&
        target.closest("[data-radix-popper-content-wrapper]")
      ) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        // Let Escape first dismiss an open inner Select (portaled Radix popper)
        if (document.querySelector("[data-radix-popper-content-wrapper]")) return;
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- closing the menu on route change is intentional
    setIsOpen(false);
  }, [pathname]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
          isOpen
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        )}
      >
        {trigger}
        {isModified && (
          <span className="h-2 w-2 rounded-full bg-primary ring-2 ring-primary/25" aria-hidden="true" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border bg-popover p-0 shadow-lg animate-in fade-in-0 zoom-in-95 duration-150 max-h-[calc(100vh-4rem)] overflow-y-auto">
          {/* Layout Section */}
          <div className="p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Layout</span>
              <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-pointer hover:text-foreground" />
            </div>
            <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-0.5">
              {layoutOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setLayout(opt.value)}
                  aria-pressed={options.layout === opt.value}
                  title={opt.label}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md py-2 text-xs transition-all",
                    options.layout === opt.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Completed tasks toggle */}
          <div className="flex items-center justify-between border-t px-3 py-2.5">
            <span className="text-xs text-foreground">Completed tasks</span>
            <Switch
              checked={options.showCompleted}
              onCheckedChange={setShowCompleted}
              className="scale-75"
            />
          </div>

          {/* Sort Section */}
          <CollapsibleSection title="Sort">
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs",
                  options.grouping !== defaultDisplayOptions.grouping
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Grouping
              </span>
              <Select
                value={options.grouping}
                onValueChange={(v) => setGrouping(v as GroupingOption)}
              >
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {groupingOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs",
                  options.sorting !== defaultDisplayOptions.sorting
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Sorting
              </span>
              <Select
                value={options.sorting}
                onValueChange={(v) => setSorting(v as SortingOption)}
              >
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sortingOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CollapsibleSection>

          {/* Filter Section */}
          <CollapsibleSection
            title="Filter"
            badge={
              (options.dateFilter !== "all" ? 1 : 0) +
              (options.priorityFilter !== "all" ? 1 : 0)
            }
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs",
                  options.dateFilter !== defaultDisplayOptions.dateFilter
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Date
              </span>
              <Select
                value={options.dateFilter}
                onValueChange={(v) => setDateFilter(v as DateFilter)}
              >
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dateFilterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  "text-xs",
                  options.priorityFilter !== defaultDisplayOptions.priorityFilter
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Priority
              </span>
              <Select
                value={options.priorityFilter}
                onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}
              >
                <SelectTrigger className="h-7 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorityFilterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CollapsibleSection>

          {isModified && (
            <div className="border-t px-3 py-2">
              <button
                onClick={resetOptions}
                className="w-full rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                Reset to defaults
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
