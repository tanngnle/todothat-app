"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  type ReactNode,
} from "react";

export type LayoutView = "list" | "board" | "calendar";
export type GroupingOption = "none" | "priority" | "due_date" | "label" | "project";
export type SortingOption = "manual" | "due_date" | "priority" | "alphabetical" | "created_date";
export type DateFilter = "all" | "today" | "overdue" | "this_week" | "next_week" | "no_date";
export type PriorityFilter = "all" | "p1" | "p2" | "p3" | "p4";

export interface DisplayOptions {
  layout: LayoutView;
  showCompleted: boolean;
  // Sort
  grouping: GroupingOption;
  sorting: SortingOption;
  // Filter
  dateFilter: DateFilter;
  priorityFilter: PriorityFilter;
}

export const defaultDisplayOptions: DisplayOptions = {
  layout: "list",
  showCompleted: false,
  grouping: "none",
  sorting: "manual",
  dateFilter: "all",
  priorityFilter: "all",
};

export function isModifiedOptions(options: DisplayOptions): boolean {
  return (Object.keys(defaultDisplayOptions) as (keyof DisplayOptions)[]).some(
    (key) => options[key] !== defaultDisplayOptions[key]
  );
}

const STORAGE_KEY = "todoist:display-options";

const layoutValues: readonly LayoutView[] = ["list", "board", "calendar"];
const groupingValues: readonly GroupingOption[] = ["none", "priority", "due_date", "label", "project"];
const sortingValues: readonly SortingOption[] = ["manual", "due_date", "priority", "alphabetical", "created_date"];
const dateFilterValues: readonly DateFilter[] = ["all", "today", "overdue", "this_week", "next_week", "no_date"];
const priorityFilterValues: readonly PriorityFilter[] = ["all", "p1", "p2", "p3", "p4"];

function sanitizeOptions(parsed: Partial<DisplayOptions>, base: DisplayOptions): DisplayOptions {
  return {
    layout: layoutValues.includes(parsed.layout as LayoutView)
      ? (parsed.layout as LayoutView)
      : base.layout,
    showCompleted: typeof parsed.showCompleted === "boolean"
      ? parsed.showCompleted
      : base.showCompleted,
    grouping: groupingValues.includes(parsed.grouping as GroupingOption)
      ? (parsed.grouping as GroupingOption)
      : base.grouping,
    sorting: sortingValues.includes(parsed.sorting as SortingOption)
      ? (parsed.sorting as SortingOption)
      : base.sorting,
    dateFilter: dateFilterValues.includes(parsed.dateFilter as DateFilter)
      ? (parsed.dateFilter as DateFilter)
      : base.dateFilter,
    priorityFilter: priorityFilterValues.includes(parsed.priorityFilter as PriorityFilter)
      ? (parsed.priorityFilter as PriorityFilter)
      : base.priorityFilter,
  };
}

interface DisplayContextType {
  options: DisplayOptions;
  setLayout: (layout: LayoutView) => void;
  setShowCompleted: (show: boolean) => void;
  setGrouping: (grouping: GroupingOption) => void;
  setSorting: (sorting: SortingOption) => void;
  setDateFilter: (filter: DateFilter) => void;
  setPriorityFilter: (filter: PriorityFilter) => void;
  resetOptions: () => void;
}

const DisplayContext = createContext<DisplayContextType | null>(null);

export function DisplayProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<DisplayOptions>(defaultDisplayOptions);
  const [hydrated, setHydrated] = useState(false);

  useLayoutEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from external storage
        setOptions((prev) => sanitizeOptions({ ...prev, ...parsed }, defaultDisplayOptions));
      }
    } catch {
      // Ignore unreadable/corrupt stored options; keep defaults.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
    } catch {
      // Ignore storage write failures (e.g. storage unavailable).
    }
  }, [options, hydrated]);

  const setLayout = useCallback((layout: LayoutView) => {
    setOptions((prev) => ({ ...prev, layout }));
  }, []);

  const setShowCompleted = useCallback((showCompleted: boolean) => {
    setOptions((prev) => ({ ...prev, showCompleted }));
  }, []);

  const setGrouping = useCallback((grouping: GroupingOption) => {
    setOptions((prev) => ({ ...prev, grouping }));
  }, []);

  const setSorting = useCallback((sorting: SortingOption) => {
    setOptions((prev) => ({ ...prev, sorting }));
  }, []);

  const setDateFilter = useCallback((dateFilter: DateFilter) => {
    setOptions((prev) => ({ ...prev, dateFilter }));
  }, []);

  const setPriorityFilter = useCallback((priorityFilter: PriorityFilter) => {
    setOptions((prev) => ({ ...prev, priorityFilter }));
  }, []);

  const resetOptions = useCallback(() => {
    setOptions(defaultDisplayOptions);
  }, []);

  const value = useMemo<DisplayContextType>(
    () => ({
      options,
      setLayout,
      setShowCompleted,
      setGrouping,
      setSorting,
      setDateFilter,
      setPriorityFilter,
      resetOptions,
    }),
    [options, setLayout, setShowCompleted, setGrouping, setSorting, setDateFilter, setPriorityFilter, resetOptions]
  );

  return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>;
}

export function useDisplayOptions() {
  const context = useContext(DisplayContext);
  if (!context) {
    throw new Error("useDisplayOptions must be used within a DisplayProvider");
  }
  return context;
}
