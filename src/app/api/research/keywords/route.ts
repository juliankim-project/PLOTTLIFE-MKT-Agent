import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const projectId = url.searchParams.get("projectId")
  const category = url.searchParams.get("category")
  const sort = url.searchParams.get("sort") ?? "total" // total | pc | mobile | alpha

  const db = supabaseAdmin()
  let q = db
    .from("research_sources")
    .select("id, label, category, monthly_pc, monthly_mobile, monthly_total, competition, enriched_at, data")
    .eq("kind", "keyword")

  // 기본 프로젝트
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
  if (category) q = q.eq("category", category)

  switch (sort) {
    case "pc":
      q = q.order("monthly_pc", { ascending: false, nullsFirst: false })
      break
    case "mobile":
      q = q.order("monthly_mobile", { ascending: false, nullsFirst: false })
      break
    case "alpha":
      q = q.order("label", { ascending: true })
      break
    default:
      q = q.order("monthly_total", { ascending: false, nullsFirst: false })
  }
  q = q.limit(200)

  const { data, error } = await q
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, keywords: data ?? [] })
}
