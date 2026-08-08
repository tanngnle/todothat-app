"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportButtonProps {
  onExportTasks?: () => void;
  onExportExpenses?: () => void;
  onExportProjects?: () => void;
}

export function ExportButton({
  onExportTasks,
  onExportExpenses,
  onExportProjects,
}: ExportButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onExportTasks && (
          <DropdownMenuItem onClick={onExportTasks}>
            Export Tasks (CSV)
          </DropdownMenuItem>
        )}
        {onExportExpenses && (
          <DropdownMenuItem onClick={onExportExpenses}>
            Export Expenses (CSV)
          </DropdownMenuItem>
        )}
        {onExportProjects && (
          <DropdownMenuItem onClick={onExportProjects}>
            Export Projects (CSV)
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
