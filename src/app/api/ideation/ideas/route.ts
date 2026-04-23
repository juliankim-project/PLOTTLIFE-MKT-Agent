import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const projectId = url.searchParams.get("projectId")
  const runId = url.searchParams.get("runId")
  const status = url.searchParams.get("status")
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200)

  const db = supabaseAdmin()
  let q = db
    .from("ideas")
    .select(
      "id, title, cluster, rationale, volume, fit_score, signal, related_keywords, status, created_at, ideation_run_id, persona_id"
    )
    .order("created_at", { ascending: false })
    .limit(limit)

  if (projectId) q = q.eq("project_id", projectId)
  if (runId) q = q.eq("ideation_run_id", runId)
  if (status) q = q.eq("status", status)

  // projectId 없으면 기본 프로젝트
  if (!projectId) {
    const { data: proj } = await db
      .from("projects")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (proj) q = q.eq("project_id", proj.id)
  }

  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, ideas: data ?? [] })
}
