import { Database, ExternalLink } from "lucide-react";

export function SetupRequired() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
          <Database className="h-8 w-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h2 className="mb-3 text-xl font-semibold">Supabase Setup Required</h2>
        <p className="mb-6 text-sm text-muted-foreground">
          To use this app, you need to connect a Supabase project. Update your{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">.env.local</code>{" "}
          file with your Supabase credentials:
        </p>
        <div className="mb-6 rounded-lg bg-muted p-4 text-left">
          <p className="text-xs font-mono text-muted-foreground">
            NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
            <br />
            NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
          </p>
        </div>
        <a
          href="https://supabase.com/dashboard/new"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <ExternalLink className="h-4 w-4" />
          Create Supabase Project
        </a>
      </div>
    </div>
  );
}
