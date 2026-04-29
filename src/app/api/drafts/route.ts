import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const projectId = url.searchParams.get("projectId")
  const status = url.searchParams.get("status")
  /** 다중 상태 — 콤마 구분 (예: ?statuses=approved,scheduled,published,discarded) */
  const statuses = url.searchParams.get("statuses")
  const topicId = url.searchParams.get("topicId")
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 500)

  const db = supabaseAdmin()
  let q = db
    .from("drafts")
    .select(
      "id, project_id, topic_id, title, slug, content_type, target_kpi, primary_keyword, secondary_keywords, status, progress_pct, metadata, hero_image_url, body_markdown, created_at, updated_at"
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
  else if (statuses) {
    const list = statuses
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
    if (list.length > 0) q = q.in("status", list)
  }
  if (topicId) q = q.eq("topic_id", topicId)

  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, drafts: data ?? [] })
}
