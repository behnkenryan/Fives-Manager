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

// Get current time in SAST (UTC+2) reliably
function getSAST() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const sast = new Date(utcMs + 2 * 3600000); // UTC+2
  return sast;
}

// Check if the confirmation window is open
// Window: Friday 12:00 SAST to Monday 15:00 SAST
export function isWindowOpen() {
  const sast = getSAST();
  const day = sast.getDay(); // 0=Sun, 1=Mon, 5=Fri, 6=Sat
  const hour = sast.getHours();

  if (day === 5 && hour >= 12) return true;
  if (day === 6) return true;
  if (day === 0) return true;
  if (day === 1 && hour < 15) return true;

  return false;
}

export function getWindowInfo() {
  const open = isWindowOpen();
  const sast = getSAST();
  const day = sast.getDay();
  const hour = sast.getHours();

  let message;
  if (open) {
    if (day === 1) {
      message = `Closes today at 15:00`;
    } else if (day === 0) {
      message = `Closes tomorrow (Mon) at 15:00`;
    } else {
      message = `Closes Monday at 15:00`;
    }
  } else {
    if (day === 5 && hour < 12) {
      message = `Opens today at 12:00`;
    } else {
      message = `Opens Friday at 12:00`;
    }
  }

  return { open, message };
}
