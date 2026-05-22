import { NextResponse } from "next/server";
import { getSupabase, SLOTS, logAudit } from "@/lib/supabase";

export async function POST(req) {
  const { adminPin } = await req.json();

  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Wrong admin PIN" }, { status: 403 });
  }

  const sb = getSupabase();

  const { data: currentWeek } = await sb
    .from("weeks")
    .select("id, week_number")
    .order("week_number", { ascending: false })
    .limit(1)
    .single();

  if (!currentWeek) {
    return NextResponse.json({ error: "No week found" }, { status: 404 });
  }

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
  (confirmations || []).forEach((c) => { confMap[c.player_id] = c.status; });

  const inPlayers = players.filter((p) => confMap[p.id] === "in").sort((a, b) => a.rank - b.rank);
  const playingIds = new Set(inPlayers.slice(0, SLOTS).map((p) => p.id));

  // Record history
  const historyRecords = players.map((p) => ({
    week_id: currentWeek.id,
    player_id: p.id,
    result: playingIds.has(p.id) ? "played" : confMap[p.id] === "out" ? "dropped" : "absent",
  }));
  await sb.from("history").upsert(historyRecords, { onConflict: "week_id,player_id" });

  // Reorder
  const confirmed = players.filter((p) => confMap[p.id] === "in");
  const waiting = players.filter((p) => !confMap[p.id] || confMap[p.id] === "waiting");
  const dropped = players.filter((p) => confMap[p.id] === "out");
  const reordered = [...confirmed, ...waiting, ...dropped];

  for (let i = 0; i < reordered.length; i++) {
    await sb.from("players").update({ rank: i + 1 }).eq("id", reordered[i].id);
  }

  await sb.from("weeks").update({ phase: "locked" }).eq("id", currentWeek.id);

  const newNum = currentWeek.week_number + 1;
  await sb.from("weeks").insert({ week_number: newNum, label: `Week ${newNum}`, phase: "open" });

  const playedNames = players.filter((p) => playingIds.has(p.id)).map((p) => p.name).join(", ");
  const droppedNames = dropped.map((p) => p.name).join(", ") || "none";
  await logAudit("new_week", `Started Week ${newNum}. Played: ${playedNames}. Dropped: ${droppedNames}`);

  return NextResponse.json({ ok: true, message: `Week ${newNum} started.`, newWeek: newNum });
}
