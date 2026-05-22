import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req) {
  const { adminPin, playerId, direction } = await req.json();

  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Wrong admin PIN" }, { status: 403 });
  }

  if (!playerId || !["up", "down"].includes(direction)) {
    return NextResponse.json({ error: "Need playerId and direction (up/down)" }, { status: 400 });
  }

  const sb = getSupabase();

  // Get all active players ordered by rank
  const { data: players } = await sb
    .from("players")
    .select("id, rank")
    .eq("active", true)
    .order("rank");

  if (!players) {
    return NextResponse.json({ error: "Failed to load players" }, { status: 500 });
  }

  const idx = players.findIndex((p) => p.id === playerId);
  if (idx === -1) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= players.length) {
    return NextResponse.json({ error: "Already at the top/bottom" }, { status: 400 });
  }

  // Swap ranks
  const currentRank = players[idx].rank;
  const swapRank = players[swapIdx].rank;

  await sb.from("players").update({ rank: swapRank }).eq("id", players[idx].id);
  await sb.from("players").update({ rank: currentRank }).eq("id", players[swapIdx].id);

  return NextResponse.json({ ok: true });
}
