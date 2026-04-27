import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = supabaseAdmin()
  const { data, error } = await db.from("drafts").select("*").eq("id", id).single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 })

  // topic / idea join
  let topic: Record<string, unknown> | null = null
  if (data.topic_id) {
    const { data: t } = await db
      .from("topics")
      .select("id, title, outline, primary_keyword, secondary_keywords, target_kpi, tone_guide, cta_hints, persona_id")
      .eq("id", data.topic_id)
      .maybeSingle()
    topic = t ?? null
  }
  return NextResponse.json({ ok: true, draft: { ...data, topic } })
}

const patchSchema = z.object({
  title: z.string().optional(),
  body_markdown: z.string().optional(),
  status: z.enum([
    "drafting",
    "reviewing",
    "approved",
    "scheduled",
    "published",
    "rewriting",
    "discarded",
  ]).optional(),
  progress_pct: z.number().int().min(0).max(100).optional(),
  /** 발행 예약 시각 (ISO8601) — metadata.scheduled_at 에 저장 */
  scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
  /** 발행 채널 id 배열 — metadata.channels 에 저장 */
  channels: z.array(z.string()).max(20).optional(),
})

/** 기존 metadata 를 유지하면서 특정 키만 갱신하는 helper SQL 구성 */
async function mergeMetadata(
  db: ReturnType<typeof supabaseAdmin>,
  id: string,
  patch: Record<string, unknown>
): Promise<void> {
  const { data: current } = await db
    .from("drafts")
    .select("metadata")
    .eq("id", id)
    .maybeSingle()
  const base = (current?.metadata ?? {}) as Record<string, unknown>
  const merged = { ...base, ...patch }
  await db.from("drafts").update({ metadata: merged }).eq("id", id)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 })
  const db = supabaseAdmin()

  /* scheduledAt·channels 는 metadata 에 merge 저장하고, 업데이트 페이로드에선 제외 */
  const { scheduledAt, channels, ...rest } = parsed.data
  const { data, error } = await db.from("drafts").update(rest).eq("id", id).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const metaPatch: Record<string, unknown> = {}
  if (scheduledAt !== undefined) metaPatch.scheduled_at = scheduledAt ?? null
  if (channels !== undefined) metaPatch.channels = channels
  if (parsed.data.status === "published") metaPatch.published_at = new Date().toISOString()
  if (Object.keys(metaPatch).length > 0) {
    await mergeMetadata(db, id, metaPatch)
  }

  /* 최종 draft 재조회 (metadata 업데이트 반영) */
  const { data: fresh } = await db.from("drafts").select("*").eq("id", id).maybeSingle()
  return NextResponse.json({ ok: true, draft: fresh ?? data })
}

/**
 * DELETE /api/drafts/[id]
 * 기본은 soft delete — drafts.status = 'discarded'.
 * 쿼리 ?hard=1 이면 row 자체 삭제 (storage 이미지·publications 등 cascade).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const url = new URL(req.url)
  const hard = url.searchParams.get("hard") === "1"
  const db = supabaseAdmin()

  if (hard) {
    const { error } = await db.from("drafts").delete().eq("id", id)
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, mode: "hard" })
  }

  const { data, error } = await db
    .from("drafts")
    .update({ status: "discarded" })
    .eq("id", id)
    .select()
    .single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, mode: "soft", draft: data })
}
