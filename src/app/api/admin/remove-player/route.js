import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req) {
  const { adminPin, playerId } = await req.json();

  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Wrong admin PIN" }, { status: 403 });
  }

  const sb = getSupabase();

  await sb.from("players").update({ active: false }).eq("id", playerId);

  return NextResponse.json({ ok: true });
}
