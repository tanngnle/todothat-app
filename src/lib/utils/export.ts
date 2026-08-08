// CSV/Excel export utilities

export function convertToCSV(data: any[], columns: string[]): string {
  if (!data || data.length === 0) return "";

  const headers = columns.join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col];
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(value || "").replace(/"/g, '""');
        return escaped.includes(",") ? `"${escaped}"` : escaped;
      })
      .join(",")
  );

  return [headers, ...rows].join("\n");
}

export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTasksToCSV(
  tasks: Array<{
    id: string;
    content: string;
    description?: string;
    priority: number;
    due_date?: string;
    is_completed: boolean;
    labels?: string[];
    project_name?: string;
    section_name?: string;
    created_at: string;
    completed_at?: string;
  }>,
  filename: string = "tasks"
): void {
  const columns = [
    "content",
    "description",
    "priority",
    "due_date",
    "is_completed",
    "labels",
    "project_name",
    "section_name",
    "created_at",
    "completed_at",
  ];

  const csvData = tasks.map((task) => ({
    ...task,
    priority: `P${task.priority}`,
    is_completed: task.is_completed ? "Yes" : "No",
    labels: task.labels?.join(", ") || "",
  }));

  const csv = convertToCSV(csvData, columns);
  downloadCSV(csv, `${filename}.csv`);
}

export function exportExpensesToCSV(
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    category_name?: string;
    wallet_name?: string;
    to_wallet_name?: string;
    person_name?: string;
    note?: string;
    date: string;
    created_at: string;
  }>,
  filename: string = "expenses"
): void {
  const columns = [
    "date",
    "type",
    "amount",
    "category_name",
    "wallet_name",
    "to_wallet_name",
    "person_name",
    "note",
    "created_at",
  ];

  const csvData = transactions.map((txn) => ({
    ...txn,
    amount: txn.amount / 100, // Convert from cents to dollars
    type: txn.type.charAt(0).toUpperCase() + txn.type.slice(1),
  }));

  const csv = convertToCSV(csvData, columns);
  downloadCSV(csv, `${filename}.csv`);
}

export function exportProjectsToCSV(
  projects: Array<{
    id: string;
    name: string;
    color?: string;
    view_style?: string;
    is_archived: boolean;
    is_favorite: boolean;
    created_at: string;
    task_count?: number;
  }>,
  filename: string = "projects"
): void {
  const columns = [
    "name",
    "color",
    "view_style",
    "is_archived",
    "is_favorite",
    "task_count",
    "created_at",
  ];

  const csvData = projects.map((project) => ({
    ...project,
    is_archived: project.is_archived ? "Yes" : "No",
    is_favorite: project.is_favorite ? "Yes" : "No",
  }));

  const csv = convertToCSV(csvData, columns);
  downloadCSV(csv, `${filename}.csv`);
}
