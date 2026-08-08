"use client";

import { useState } from "react";
import {
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  LayoutList,
  MessageSquare,
  MoreHorizontal,
  ChevronDown,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DisplayMenu } from "./display-menu";
import { ThemeToggle } from "./theme-toggle";

interface TopBarProps {
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onAddTask?: () => void;
  onSearch?: () => void;
  pageTitle?: string;
}

export function TopBar({
  sidebarOpen = true,
  onToggleSidebar,
  onAddTask,
  onSearch,
  pageTitle = "Inbox",
}: TopBarProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="flex h-11 items-center justify-between border-b bg-background px-3">
      {/* Left side */}
      <div className="flex items-center gap-2">
        {/* User dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-accent"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-600 text-xs font-medium text-white">
              L
            </div>
            <span className="text-sm font-medium">Letanscholar</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>

        {/* Notifications */}
        <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
          <Bell className="h-4 w-4" />
        </button>

        {/* Sidebar toggle */}
        <button
          onClick={onToggleSidebar}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeftOpen className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Center - Page title */}
      <h1 className="absolute left-1/2 -translate-x-1/2 text-base font-bold">
        {pageTitle}
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {/* Display menu */}
        <DisplayMenu
          trigger={
            <>
              <LayoutList className="h-4 w-4" />
              <span className="text-sm font-medium">Display</span>
            </>
          }
        />

        {/* Chat */}
        <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
          <MessageSquare className="h-4 w-4" />
        </button>

        {/* More */}
        <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
