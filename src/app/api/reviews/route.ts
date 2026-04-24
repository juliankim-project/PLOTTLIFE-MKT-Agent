import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

/** 특정 draft 의 최신 review 조회 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const draftId = url.searchParams.get("draftId")
  if (!draftId) {
    return NextResponse.json({ ok: false, error: "draftId required" }, { status: 400 })
  }
  const db = supabaseAdmin()
  const { data, error } = await db
    .from("reviews")
    .select("*")
    .eq("draft_id", draftId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, review: data })
}
