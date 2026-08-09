import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  // Publishable key first; legacy anon key name as fallback (same precedence
  // as src/lib/supabase/server.ts).
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  );
}
