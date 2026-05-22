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

// Check if the confirmation window is open
// Window: Friday 12:00 SAST to Monday 15:00 SAST
export function isWindowOpen() {
  // Get current time in South Africa (SAST = UTC+2)
  const now = new Date();
  const sast = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
  const day = sast.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const hour = sast.getHours();

  // Friday 12:00+ → open
  if (day === 5 && hour >= 12) return true;
  // Saturday all day → open
  if (day === 6) return true;
  // Sunday all day → open
  if (day === 0) return true;
  // Monday before 15:00 → open
  if (day === 1 && hour < 15) return true;

  return false;
}

// Get window status info for the frontend
export function getWindowInfo() {
  const open = isWindowOpen();

  const now = new Date();
  const sast = new Date(now.toLocaleString("en-US", { timeZone: "Africa/Johannesburg" }));
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
