import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req) {
  const { playerId, pin } = await req.json();

  if (!playerId || !pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: "Need player ID and 4-digit PIN" }, { status: 400 });
  }

  const sb = getSupabase();

  // Check if player already has a PIN
  const { data: player } = await sb
    .from("players")
    .select("id, pin, name")
    .eq("id", playerId)
    .single();

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (player.pin) {
    return NextResponse.json({ error: "PIN already set. Contact admin to reset." }, { status: 400 });
  }

  await sb.from("players").update({ pin }).eq("id", playerId);

  return NextResponse.json({ ok: true, message: `PIN set for ${player.name}` });
}
