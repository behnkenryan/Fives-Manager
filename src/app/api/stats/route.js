import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabase();

  const { data: players } = await sb
    .from("players")
    .select("id, name, emoji, rank")
    .eq("active", true)
    .order("rank");

  const { data: history } = await sb
    .from("history")
    .select("player_id, result");

  // Aggregate stats per player
  const statsMap = {};
  (history || []).forEach((h) => {
    if (!statsMap[h.player_id]) {
      statsMap[h.player_id] = { played: 0, dropped: 0, absent: 0 };
    }
    statsMap[h.player_id][h.result]++;
  });

  const stats = (players || []).map((p) => {
    const s = statsMap[p.id] || { played: 0, dropped: 0, absent: 0 };
    const total = s.played + s.dropped + s.absent;
    const reliability = total > 0 ? Math.round((s.played / total) * 100) : 0;
    
    // Current streak: count consecutive "played" from most recent
    let streak = 0;
    const playerHistory = (history || [])
      .filter((h) => h.player_id === p.id);
    // We need ordered history for streak - re-query would be better but let's approximate
    // For now just show totals

    return {
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      rank: p.rank,
      gamesPlayed: s.played,
      gamesDropped: s.dropped,
      gamesAbsent: s.absent,
      totalWeeks: total,
      reliability,
    };
  });

  return NextResponse.json({ stats });
}
