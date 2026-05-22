import { createClient } from "@supabase/supabase-js";

export function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export const SLOTS = 10;

export async function logAudit(action, details) {
  const sb = getSupabase();
  await sb.from("audit_log").insert({ action, details });
}
