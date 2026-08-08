"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Calendar,
  CalendarDays,
  Tag,
  Filter,
  Plus,
  Search,
  BarChart3,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { signOut } from "@/app/(auth)/actions";
import { useState } from "react";
import { createProject } from "@/actions/projects";
import type { Project } from "@/types/database";

interface ProjectTreeNode extends Project {
  children: ProjectTreeNode[];
}

interface SidebarClientProps {
  projectTree: ProjectTreeNode[];
  inbox: Project | null;
}

function ProjectItem({
  project,
  pathname,
  depth = 0,
}: {
  project: ProjectTreeNode;
  pathname: string;
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = project.children.length > 0;
  const isActive = pathname === `/project/${project.id}`;

  return (
    <li>
      <div
        className={cn(
          "flex items-center gap-1 rounded-md transition-colors hover:bg-accent",
          isActive && "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
        )}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded hover:bg-accent"
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        )}
        {!hasChildren && <span className="w-5" />}
        <Link
          href={`/project/${project.id}`}
          className="flex flex-1 items-center gap-2 px-2 py-1.5 text-sm"
        >
          {project.icon ? (
            <span className="text-sm">{project.icon}</span>
          ) : (
            <FolderOpen
              className="h-4 w-4"
              style={{ color: project.color }}
            />
          )}
          <span className="truncate">{project.name}</span>
        </Link>
      </div>

      {isOpen && hasChildren && (
        <ul className="space-y-0.5">
          {project.children.map((child) => (
            <ProjectItem
              key={child.id}
              project={child}
              pathname={pathname}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function SidebarClient({ projectTree, inbox }: SidebarClientProps) {
  const pathname = usePathname();
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;
    const formData = new FormData();
    formData.set("name", newProjectName.trim());
    await createProject(formData);
    setNewProjectName("");
    setShowAddProject(false);
  };

  const navItems = [
    { href: "/", label: "Inbox", icon: Inbox },
    { href: "/today", label: "Today", icon: Calendar },
    { href: "/upcoming", label: "Upcoming", icon: CalendarDays },
    { href: "/filters", label: "Filters & Labels", icon: Filter },
  ];

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-[#fafafa] dark:bg-sidebar">
      {/* Add task button */}
      <div className="px-3 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add task
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 py-1">
        <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent">
          <Search className="h-4 w-4" />
          Search
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-1">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/" && pathname === "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                    isActive && "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* My Projects Section */}
        <div className="mt-4">
          <div className="flex items-center justify-between px-3">
            <button
              onClick={() => setProjectsOpen(!projectsOpen)}
              className="flex items-center gap-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground"
            >
              {projectsOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              My Projects
            </button>
            <button
              onClick={() => setShowAddProject(!showAddProject)}
              className="rounded p-1 hover:bg-accent"
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {projectsOpen && (
            <ul className="mt-1 space-y-0.5">
              {projectTree.map((project) => (
                <ProjectItem
                  key={project.id}
                  project={project}
                  pathname={pathname}
                />
              ))}

              {showAddProject && (
                <li className="px-3 py-1">
                  <input
                    autoFocus
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddProject();
                      if (e.key === "Escape") setShowAddProject(false);
                    }}
                    onBlur={() => {
                      if (newProjectName.trim()) handleAddProject();
                      else setShowAddProject(false);
                    }}
                    placeholder="Project name"
                    className="w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Expenses */}
        <div className="mt-4 border-t pt-2">
          <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Finance
          </div>
          <ul className="mt-1 space-y-0.5">
            <li>
              <Link
                href="/expenses"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                  pathname === "/expenses" && "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                )}
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                </svg>
                Expenses
              </Link>
            </li>
            <li>
              <Link
                href="/expenses/investments"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors hover:bg-accent",
                  pathname === "/expenses/investments" && "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                )}
              >
                <TrendingUp className="h-4 w-4" />
                Investments
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t p-2 flex items-center justify-between">
        <form action={signOut}>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            type="submit"
          >
            Log out
          </Button>
        </form>
        <ThemeToggle />
      </div>
    </aside>
  );
}
