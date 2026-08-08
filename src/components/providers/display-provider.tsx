"use client";

import React, { createContext, useContext, useState, useCallback, type ReactNode } from "react";

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

const defaultDisplayOptions: DisplayOptions = {
  layout: "list",
  showCompleted: false,
  grouping: "none",
  sorting: "manual",
  dateFilter: "all",
  priorityFilter: "all",
};

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

  return (
    <DisplayContext.Provider
      value={{
        options,
        setLayout,
        setShowCompleted,
        setGrouping,
        setSorting,
        setDateFilter,
        setPriorityFilter,
        resetOptions,
      }}
    >
      {children}
    </DisplayContext.Provider>
  );
}

export function useDisplayOptions() {
  const context = useContext(DisplayContext);
  if (!context) {
    throw new Error("useDisplayOptions must be used within a DisplayProvider");
  }
  return context;
}
