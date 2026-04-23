import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const projectId = url.searchParams.get("projectId")
  const status = url.searchParams.get("status")
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200)

  const db = supabaseAdmin()
  let q = db
    .from("topics")
    .select(
      "id, project_id, idea_id, title, slug, primary_keyword, secondary_keywords, target_kpi, persona_id, outline, cta_hints, tone_guide, brief, score, status, stage_limit, finalized_at, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit)

  if (projectId) q = q.eq("project_id", projectId)
  else {
    const { data: proj } = await db
      .from("projects")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (proj) q = q.eq("project_id", proj.id)
  }
  if (status) q = q.eq("status", status)

  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, topics: data ?? [] })
}
