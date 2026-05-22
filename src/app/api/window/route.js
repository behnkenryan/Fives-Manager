import { NextResponse } from "next/server";
import { getWindowInfo } from "@/lib/supabase";

export async function GET() {
  const info = getWindowInfo();
  return NextResponse.json(info);
}
