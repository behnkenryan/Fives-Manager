import { NextResponse } from "next/server";
import { getSupabase, SLOTS } from "@/lib/supabase";

export async function POST(req) {
  const { adminPin } = await req.json();

  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Wrong admin PIN" }, { status: 403 });
  }

  const sb = getSupabase();

  // Get current week
  const { data: currentWeek } = await sb
    .from("weeks")
    .select("id, week_number")
    .order("week_number", { ascending: false })
    .limit(1)
    .single();

  if (!currentWeek) {
    return NextResponse.json({ error: "No week found" }, { status: 404 });
  }

  // Get all players and their confirmations for this week
  const { data: players } = await sb
    .from("players")
    .select("id, name, rank")
    .eq("active", true)
    .order("rank");

  const { data: confirmations } = await sb
    .from("confirmations")
    .select("player_id, status")
    .eq("week_id", currentWeek.id);

  const confMap = {};
  (confirmations || []).forEach((c) => {
    confMap[c.player_id] = c.status;
  });

  // Determine who was playing (first SLOTS "in" players by rank)
  const inPlayers = players
    .filter((p) => confMap[p.id] === "in")
    .sort((a, b) => a.rank - b.rank);

  const playingIds = new Set(inPlayers.slice(0, SLOTS).map((p) => p.id));

  // Record history for all players
  const historyRecords = players.map((p) => {
    let result;
    if (playingIds.has(p.id)) {
      result = "played";
    } else if (confMap[p.id] === "out") {
      result = "dropped";
    } else {
      result = "absent";
    }
    return {
      week_id: currentWeek.id,
      player_id: p.id,
      result,
    };
  });

  // Insert history (ignore conflicts if already recorded)
  await sb.from("history").upsert(historyRecords, { onConflict: "week_id,player_id" });

  // Reorder: confirmed players keep priority, then waiting, dropouts go to bottom
  const confirmed = players.filter((p) => confMap[p.id] === "in");
  const waiting = players.filter((p) => !confMap[p.id] || confMap[p.id] === "waiting");
  const dropped = players.filter((p) => confMap[p.id] === "out");

  const reordered = [...confirmed, ...waiting, ...dropped];

  // Update ranks
  for (let i = 0; i < reordered.length; i++) {
    await sb.from("players").update({ rank: i + 1 }).eq("id", reordered[i].id);
  }

  // Lock current week
  await sb.from("weeks").update({ phase: "locked" }).eq("id", currentWeek.id);

  // Create new week
  const newNum = currentWeek.week_number + 1;
  await sb.from("weeks").insert({
    week_number: newNum,
    label: `Week ${newNum}`,
    phase: "open",
  });

  return NextResponse.json({
    ok: true,
    message: `Week ${newNum} started. History recorded. Ranks updated.`,
    newWeek: newNum,
  });
}
