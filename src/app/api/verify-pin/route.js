import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req) {
  const { playerId, pin } = await req.json();

  if (!playerId || !pin) {
    return NextResponse.json({ error: "Need player ID and PIN" }, { status: 400 });
  }

  const sb = getSupabase();

  const { data: player } = await sb
    .from("players")
    .select("id, pin, name, emoji")
    .eq("id", playerId)
    .single();

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (!player.pin) {
    return NextResponse.json({ error: "No PIN set" }, { status: 400 });
  }

  if (player.pin !== pin) {
    return NextResponse.json({ error: "Wrong PIN" }, { status: 403 });
  }

  return NextResponse.json({
    ok: true,
    message: `Welcome, ${player.name}!`,
  });
}
