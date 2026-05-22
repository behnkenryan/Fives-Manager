import { NextResponse } from "next/server";
import { getSupabase, SLOTS } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabase();

  // Get current week (latest)
  const { data: week } = await sb
    .from("weeks")
    .select("*")
    .order("week_number", { ascending: false })
    .limit(1)
    .single();

  if (!week) {
    return NextResponse.json({ error: "No week found" }, { status: 404 });
  }

  // Get all active players ordered by rank
  const { data: players } = await sb
    .from("players")
    .select("id, name, emoji, rank, active")
    .eq("active", true)
    .order("rank");

  // Get confirmations for this week
  const { data: confirmations } = await sb
    .from("confirmations")
    .select("player_id, status, confirmed_at")
    .eq("week_id", week.id);

  const confMap = {};
  (confirmations || []).forEach((c) => {
    confMap[c.player_id] = c;
  });

  // Build player list with statuses
  // "in" players sorted by rank; first SLOTS are playing, rest standby
  const inPlayers = (players || [])
    .filter((p) => confMap[p.id]?.status === "in")
    .sort((a, b) => a.rank - b.rank);

  const result = (players || []).map((p) => {
    const conf = confMap[p.id];
    let section = "waiting";
    if (conf?.status === "in") {
      const idx = inPlayers.findIndex((ip) => ip.id === p.id);
      section = idx < SLOTS ? "playing" : "standby";
    } else if (conf?.status === "out") {
      section = "dropped";
    }

    return {
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      rank: p.rank,
      status: conf?.status || "waiting",
      section,
      confirmedAt: conf?.confirmed_at || null,
      hasPin: false, // never expose pin existence to client broadly
    };
  });

  // Check which players have PINs set (separate query)
  const { data: pinData } = await sb
    .from("players")
    .select("id, pin")
    .eq("active", true);

  const pinMap = {};
  (pinData || []).forEach((p) => {
    pinMap[p.id] = !!p.pin;
  });

  result.forEach((p) => {
    p.hasPin = pinMap[p.id] || false;
  });

  const spotsUsed = Math.min(inPlayers.length, SLOTS);

  return NextResponse.json({
    week: {
      id: week.id,
      number: week.week_number,
      label: week.label,
      phase: week.phase,
    },
    players: result,
    spotsUsed,
    spotsLeft: Math.max(0, SLOTS - spotsUsed),
    standbyCount: Math.max(0, inPlayers.length - SLOTS),
  });
}
