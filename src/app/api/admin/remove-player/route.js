import { NextResponse } from "next/server";
import { getSupabase, logAudit } from "@/lib/supabase";

export async function POST(req) {
  const { adminPin, playerId } = await req.json();

  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Wrong admin PIN" }, { status: 403 });
  }

  const sb = getSupabase();
  const { data: player } = await sb.from("players").select("name").eq("id", playerId).single();
  await sb.from("players").update({ active: false }).eq("id", playerId);

  await logAudit("remove_player", `Removed ${player?.name || playerId}`);
  return NextResponse.json({ ok: true });
}
