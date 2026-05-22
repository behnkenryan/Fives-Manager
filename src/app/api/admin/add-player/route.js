import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req) {
  const { adminPin, name, emoji } = await req.json();

  if (adminPin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ error: "Wrong admin PIN" }, { status: 403 });
  }

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const sb = getSupabase();

  // Get highest rank
  const { data: last } = await sb
    .from("players")
    .select("rank")
    .order("rank", { ascending: false })
    .limit(1)
    .single();

  const nextRank = (last?.rank || 0) + 1;

  const { data: player, error } = await sb
    .from("players")
    .insert({
      name: name.trim(),
      emoji: emoji || "⚽",
      rank: nextRank,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, player });
}
