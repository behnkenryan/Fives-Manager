import { createClient } from "@supabase/supabase-js";

// Server-side client with service role key (full access)
export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export const SLOTS = 10;
