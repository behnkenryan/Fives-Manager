import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabase();

  const { data: logs } = await sb
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ logs: logs || [] });
}
