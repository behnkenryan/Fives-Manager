import { NextResponse } from "next/server";
import { getSupabase, logAudit } from "@/lib/supabase";

export async function POST(req) {
  const { adminPin, playerId, status } = await req.json();

  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Wrong admin PIN" }, { status: 403 });
  }

  if (!playerId || !["in", "out", "clear"].includes(status)) {
    return NextResponse.json({ error: "Need playerId and status (in/out/clear)" }, { status: 400 });
  }

  const sb = getSupabase();

  const { data: player } = await sb
    .from("players")
    .select("id, name, emoji")
    .eq("id", playerId)
    .single();

  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }

  const { data: week } = await sb
    .from("weeks")
    .select("id")
    .order("week_number", { ascending: false })
    .limit(1)
    .single();

  if (!week) {
    return NextResponse.json({ error: "No active week" }, { status: 400 });
  }

  if (status === "clear") {
    await sb.from("confirmations")
      .delete()
      .eq("week_id", week.id)
      .eq("player_id", playerId);

    await logAudit("override_clear", `Admin cleared status for ${player.name}`);
  } else {
    await sb.from("confirmations").upsert(
      {
        week_id: week.id,
        player_id: playerId,
        status,
        confirmed_at: new Date().toISOString(),
      },
      { onConflict: "week_id,player_id" }
    );

    const label = status === "in" ? "IN" : "OUT";
    await logAudit("override_status", `Admin set ${player.name} to ${label}`);
  }

  return NextResponse.json({
    ok: true,
    message: `${player.emoji} ${player.name} → ${status === "clear" ? "CLEARED" : status.toUpperCase()}`,
  });
}
