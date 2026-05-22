import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req) {
  const { playerId, pin } = await req.json();

  if (!playerId || !pin) {
    return NextResponse.json({ error: "Need player ID and PIN" }, { status: 400 });
  }

  const sb = getSupabase();

  // Verify PIN
  const { data: player } = await sb
    .from("players")
    .select("id, pin, name, emoji")
    .eq("id", playerId)
    .single();

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  if (!player.pin) {
    return NextResponse.json({ error: "Set your PIN first" }, { status: 400 });
  }

  if (player.pin !== pin) {
    return NextResponse.json({ error: "Wrong PIN" }, { status: 403 });
  }

  // Get current week
  const { data: week } = await sb
    .from("weeks")
    .select("id, phase")
    .order("week_number", { ascending: false })
    .limit(1)
    .single();

  if (!week || week.phase === "locked") {
    return NextResponse.json({ error: "Week is locked" }, { status: 400 });
  }

  // Upsert confirmation
  await sb.from("confirmations").upsert(
    {
      week_id: week.id,
      player_id: playerId,
      status: "in",
      confirmed_at: new Date().toISOString(),
    },
    { onConflict: "week_id,player_id" }
  );

  return NextResponse.json({
    ok: true,
    message: `${player.emoji} ${player.name} is IN!`,
  });
}
