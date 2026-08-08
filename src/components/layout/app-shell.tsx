"use client";

import { TopBar } from "@/components/layout/top-bar";
import { DisplayProvider } from "@/components/providers/display-provider";
import { QuickAdd } from "@/components/tasks/quick-add";
import { SearchCommand } from "@/components/layout/search-command";
import { Toaster } from "@/components/ui/sonner";
import type { ReactNode } from "react";

interface SearchData {
  tasks: Array<{ id: string; content: string; project_id: string }>;
  projects: Array<{ id: string; name: string }>;
  labels: Array<{ id: string; name: string }>;
}

interface AppShellProps {
  children: ReactNode;
  sidebar: ReactNode;
  pageTitle?: string;
  searchData?: SearchData;
}

function AppShellInner({ children, sidebar, pageTitle = "Inbox", searchData }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar - always visible */}
      <div className="shrink-0">
        {sidebar}
      </div>
      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar pageTitle={pageTitle} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      {/* Global overlays */}
      <QuickAdd />
      <SearchCommand
        tasks={searchData?.tasks ?? []}
        projects={searchData?.projects ?? []}
        labels={searchData?.labels ?? []}
      />
      <Toaster />
    </div>
  );
}

export function AppShell(props: AppShellProps) {
  return (
    <DisplayProvider>
      <AppShellInner {...props} />
    </DisplayProvider>
  );
}
