import { NextResponse } from "next/server";
import { getSupabase, logAudit } from "@/lib/supabase";

export async function POST(req) {
  const { adminPin, playerId } = await req.json();

  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Wrong admin PIN" }, { status: 403 });
  }

  const sb = getSupabase();
  const { data: player } = await sb.from("players").select("id, name").eq("id", playerId).single();
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  await sb.from("players").update({ pin: null }).eq("id", playerId);

  await logAudit("reset_pin", `Reset PIN for ${player.name}`);
  return NextResponse.json({ ok: true, message: `PIN reset for ${player.name}. They can set a new one.` });
}
