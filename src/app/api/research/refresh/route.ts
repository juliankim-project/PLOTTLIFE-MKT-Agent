import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/server"
import { enrichKeywordsSafely } from "@/lib/research/naver-ads"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const bodySchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
})

/** 기존 키워드의 월검색량·경쟁도를 네이버 API로 새로고침. */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    body = {}
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 })
  }

  const db = supabaseAdmin()
  let q = db
    .from("research_sources")
    .select("id, label, project_id")
    .eq("kind", "keyword")
  if (parsed.data.ids) q = q.in("id", parsed.data.ids)

  const { data: rows, error } = await q.limit(50)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!rows || rows.length === 0) return NextResponse.json({ ok: true, refreshed: 0 })

  try {
    const metrics = await enrichKeywordsSafely(
      rows.map((r) => r.label),
      { batchSize: 5, delayMs: 400 }
    )

    let refreshed = 0
    for (const row of rows) {
      const m = metrics.get(row.label) ??
        [...metrics.values()].find(
          (x) => x.keyword.replace(/\s+/g, "").toUpperCase() === row.label.replace(/\s+/g, "").toUpperCase()
        )
      if (!m) continue
      await db
        .from("research_sources")
        .update({
          monthly_pc: m.monthlyPc,
          monthly_mobile: m.monthlyMobile,
          monthly_total: m.monthlyTotal,
          competition: m.competition,
          enriched_at: new Date().toISOString(),
        })
        .eq("id", row.id)
      refreshed++
    }

    return NextResponse.json({ ok: true, refreshed, totalRequested: rows.length })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
