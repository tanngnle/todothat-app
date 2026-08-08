"use client";

import { useEffect, useCallback, useRef } from "react";

type ShortcutHandler = () => void;

interface Shortcut {
  key: string;
  handler: ShortcutHandler;
  description: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

const shortcuts: Shortcut[] = [
  { key: "q", handler: () => {}, description: "Quick add task" },
  { key: "/", handler: () => {}, description: "Search" },
  { key: "Escape", handler: () => {}, description: "Close panel/dialog" },
  { key: "1", handler: () => {}, description: "Set priority P1", shift: true },
  { key: "2", handler: () => {}, description: "Set priority P2", shift: true },
  { key: "3", handler: () => {}, description: "Set priority P3", shift: true },
  { key: "4", handler: () => {}, description: "Set priority P4", shift: true },
  { key: "d", handler: () => {}, description: "Set due date" },
  { key: "e", handler: () => {}, description: "Edit task" },
  { key: "Delete", handler: () => {}, description: "Delete task" },
  { key: "ArrowUp", handler: () => {}, description: "Previous task" },
  { key: "ArrowDown", handler: () => {}, description: "Next task" },
  { key: "Enter", handler: () => {}, description: "Open task" },
  { key: "?", handler: () => {}, description: "Show shortcuts help" },
];

export function useKeyboardShortcuts(handlers: Partial<Record<string, ShortcutHandler>>) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    const key = event.key;

    // Check for shortcut handlers
    if (handlersRef.current[key]) {
      event.preventDefault();
      handlersRef.current[key]();
    }

    // Number keys for priority (with shift)
    if (event.shiftKey && key >= "1" && key <= "4") {
      event.preventDefault();
      const priorityKey = `p${key}`;
      if (handlersRef.current[priorityKey]) {
        handlersRef.current[priorityKey]();
      }
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export function getShortcutsList() {
  return shortcuts;
}
