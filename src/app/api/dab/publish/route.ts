import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/server"
import { saveBlogToAdmin } from "@/lib/dab/client"
import { DAB_CATEGORIES } from "@/lib/dab/category"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

const SEND_WHEN = ["immediate", "next-day-midnight"] as const

const sendSchema = z.object({
  action: z.literal("send"),
  draftId: z.string().uuid(),
  category: z.enum(DAB_CATEGORIES),
  /** 항상 "DRAFT" — 어드민에서 게시 토글은 별도 (그쪽 영역) */
  status: z.literal("DRAFT").default("DRAFT").optional(),
})

const scheduleSchema = z.object({
  action: z.literal("schedule"),
  draftId: z.string().uuid(),
  category: z.enum(DAB_CATEGORIES),
  when: z.enum(SEND_WHEN),
})

const untoggleSchema = z.object({
  action: z.literal("untoggle"),
  draftId: z.string().uuid(),
})

const setWhenSchema = z.object({
  action: z.literal("set-when"),
  draftId: z.string().uuid(),
  when: z.enum(SEND_WHEN),
})

const bodySchema = z.discriminatedUnion("action", [
  sendSchema,
  scheduleSchema,
  untoggleSchema,
  setWhenSchema,
])

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid body", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const db = supabaseAdmin()
  const action = parsed.data.action
  const { draftId } = parsed.data

  /* drafts 조회 (모든 action 공통) */
  const { data: draft, error: draftErr } = await db
    .from("drafts")
    .select(
      "id, title, body_markdown, hero_image_url, primary_keyword, secondary_keywords, metadata, topic_id"
    )
    .eq("id", draftId)
    .single()
  if (draftErr || !draft) {
    return NextResponse.json(
      { ok: false, error: `draft not found: ${draftErr?.message}` },
      { status: 404 }
    )
  }

  const baseMeta = (draft.metadata as Record<string, unknown> | null) ?? {}

  /* ─── action: untoggle — metadata 만 OFF (어드민 호출 X) ─── */
  if (action === "untoggle") {
    const nextMetadata = {
      ...baseMeta,
      dab_send_intent: false,
      dab_send_status: null,
      dab_send_scheduled_at: null,
      /* dab_blog_id 는 유지 — 다음 ON 시 같은 id 로 update */
    }
    const { error } = await db.from("drafts").update({ metadata: nextMetadata }).eq("id", draftId)
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, metadata: nextMetadata })
  }

  /* ─── action: set-when — when 값만 변경 ─── */
  if (action === "set-when") {
    const nextMetadata = { ...baseMeta, dab_send_when: parsed.data.when }
    const { error } = await db.from("drafts").update({ metadata: nextMetadata }).eq("id", draftId)
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, metadata: nextMetadata })
  }

  /* ─── action: schedule — queued 상태로 예약 (Vercel Cron 워커가 발송) ─── */
  if (action === "schedule") {
    const scheduledAt = computeScheduledAt(parsed.data.when).toISOString()
    const nextMetadata = {
      ...baseMeta,
      dab_send_intent: true,
      dab_send_when: parsed.data.when,
      dab_send_status: "queued",
      dab_send_scheduled_at: scheduledAt,
      dab_category: parsed.data.category,
    }
    const { error } = await db.from("drafts").update({ metadata: nextMetadata }).eq("id", draftId)
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, metadata: nextMetadata })
  }

  /* ─── action: send — 즉시 어드민에 DRAFT 전송 ─── */
  if (!draft.body_markdown || draft.body_markdown.length < 200) {
    return NextResponse.json(
      { ok: false, error: "본문이 비어있거나 너무 짧아 전송할 수 없어요 (200자 이상 필요)" },
      { status: 400 }
    )
  }

  /* sending 상태로 먼저 마킹 (UI 가 즉시 반영) */
  await db
    .from("drafts")
    .update({
      metadata: {
        ...baseMeta,
        dab_send_intent: true,
        dab_send_when: "immediate",
        dab_send_status: "sending",
        dab_send_scheduled_at: null,
      },
    })
    .eq("id", draftId)

  /* topic 조회 */
  let topic: { journey_stage?: string | null } | null = null
  if (draft.topic_id) {
    const { data } = await db
      .from("topics")
      .select("journey_stage")
      .eq("id", draft.topic_id)
      .maybeSingle()
    topic = data ?? null
  }

  /* 어드민 호출 — 항상 DRAFT 로 전송 */
  const result = await saveBlogToAdmin({
    draft: {
      title: draft.title,
      body_markdown: draft.body_markdown,
      cover_url: draft.hero_image_url,
      primary_keyword: draft.primary_keyword,
      secondary_keywords: draft.secondary_keywords,
      metadata: draft.metadata,
    },
    topic,
    category: parsed.data.category,
    status: "DRAFT",
  })

  if (!result.ok) {
    /* 실패 — 상태 failed */
    const nextMetadata = {
      ...baseMeta,
      dab_send_intent: true,
      dab_send_when: "immediate",
      dab_send_status: "failed",
      dab_send_error: result.error,
      dab_send_scheduled_at: null,
    }
    await db.from("drafts").update({ metadata: nextMetadata }).eq("id", draftId)
    return NextResponse.json({ ok: false, error: result.error, metadata: nextMetadata }, { status: 502 })
  }

  /* 성공 — 상태 sent */
  const sentAt = new Date().toISOString()
  const nextMetadata = {
    ...baseMeta,
    dab_blog_id: result.dabBlogId,
    dab_status: result.dabStatus,
    dab_category: result.dabCategory,
    dab_registered_at: result.registeredAt,
    dab_mode: result.mode,
    dab_send_intent: true,
    dab_send_when: "immediate",
    dab_send_status: "sent",
    dab_send_at: sentAt,
    dab_send_scheduled_at: null,
    dab_send_error: null,
  }
  const { error: updErr } = await db
    .from("drafts")
    .update({ metadata: nextMetadata })
    .eq("id", draftId)
  if (updErr) {
    return NextResponse.json(
      { ok: false, error: `metadata 업데이트 실패: ${updErr.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, result, metadata: nextMetadata })
}

function computeScheduledAt(when: (typeof SEND_WHEN)[number]): Date {
  switch (when) {
    case "immediate":         return new Date()
    case "next-day-midnight": return computeNextKstMidnight()
  }
}

/** KST(UTC+9) 기준 다음날 00:00 → UTC Date */
function computeNextKstMidnight(): Date {
  const now = new Date()
  /* 현재 시각을 KST 로 환산 */
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  /* KST 기준 오늘 자정 */
  kst.setUTCHours(0, 0, 0, 0)
  /* 다음날 00:00 (KST) */
  kst.setUTCDate(kst.getUTCDate() + 1)
  /* UTC 로 환산 */
  return new Date(kst.getTime() - 9 * 60 * 60 * 1000)
}
