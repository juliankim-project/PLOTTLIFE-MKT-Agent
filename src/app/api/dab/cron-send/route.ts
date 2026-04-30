/**
 * Vercel Cron 워커 — queued 항목 발송.
 *
 * vercel.json 의 cron 으로 1분마다 호출됨.
 *  - drafts.metadata.dab_send_status = "queued"
 *  - dab_send_scheduled_at <= now()
 *  → saveBlogToAdmin 호출 → metadata 업데이트 (sent / failed)
 *
 * 인증:
 *  - Vercel Cron 은 Authorization: Bearer <CRON_SECRET> 헤더를 자동 추가
 *  - 환경변수 CRON_SECRET 미설정 시 — 인증 우회 (로컬/dev)
 *
 * 한 번 실행에 최대 BATCH_LIMIT 건만 처리 (Vercel 5분 timeout 회피).
 */

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"
import { saveBlogToAdmin } from "@/lib/dab/client"
import type { DabCategory } from "@/lib/dab/category"
import { pickDabCategory } from "@/lib/dab/category"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const BATCH_LIMIT = 10

interface DraftRow {
  id: string
  title: string
  body_markdown: string | null
  hero_image_url: string | null
  primary_keyword: string | null
  secondary_keywords: string[] | null
  metadata: Record<string, unknown> | null
  topic_id: string | null
}

export async function GET(req: Request) {
  return handle(req)
}
export async function POST(req: Request) {
  return handle(req)
}

async function handle(req: Request) {
  /* 인증 — CRON_SECRET 설정된 경우만 */
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? ""
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }
  }

  const db = supabaseAdmin()
  const now = new Date().toISOString()

  /* queued + due 항목 select
     ※ Postgres 의 jsonb 연산자 활용:
       metadata->>'dab_send_status' = 'queued' AND
       metadata->>'dab_send_scheduled_at' <= now */
  const { data: rows, error: selErr } = await db
    .from("drafts")
    .select(
      "id, title, body_markdown, hero_image_url, primary_keyword, secondary_keywords, metadata, topic_id"
    )
    .filter("metadata->>dab_send_status", "eq", "queued")
    .lte("metadata->>dab_send_scheduled_at", now)
    .limit(BATCH_LIMIT)

  if (selErr) {
    return NextResponse.json({ ok: false, error: selErr.message }, { status: 500 })
  }

  const due = (rows ?? []) as DraftRow[]
  if (due.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, ts: now })
  }

  const results: Array<{ draftId: string; ok: boolean; error?: string }> = []

  for (const draft of due) {
    try {
      /* topic 조회 (선택) */
      let topic: { journey_stage?: string | null } | null = null
      if (draft.topic_id) {
        const { data } = await db
          .from("topics")
          .select("journey_stage")
          .eq("id", draft.topic_id)
          .maybeSingle()
        topic = data ?? null
      }

      /* sending 마킹 (UI 가 즉시 반영) */
      const baseMeta = draft.metadata ?? {}
      await db
        .from("drafts")
        .update({
          metadata: { ...baseMeta, dab_send_status: "sending" },
        })
        .eq("id", draft.id)

      /* 카테고리 — metadata 우선, 없으면 자동 매핑 */
      const category =
        ((baseMeta as { dab_category?: string }).dab_category as DabCategory) ??
        pickDabCategory({
          title: draft.title,
          primaryKeyword: draft.primary_keyword,
          secondaryKeywords: draft.secondary_keywords,
          journeyStage: topic?.journey_stage ?? null,
        })

      /* 어드민 호출 */
      const result = await saveBlogToAdmin({
        draft: {
          title: draft.title,
          body_markdown: draft.body_markdown,
          cover_url: draft.hero_image_url,
          primary_keyword: draft.primary_keyword,
          secondary_keywords: draft.secondary_keywords,
          metadata: baseMeta,
        },
        topic,
        category,
        status: "DRAFT",
      })

      if (!result.ok) {
        await db
          .from("drafts")
          .update({
            metadata: {
              ...baseMeta,
              dab_send_status: "failed",
              dab_send_error: result.error,
              dab_send_scheduled_at: null,
            },
          })
          .eq("id", draft.id)
        results.push({ draftId: draft.id, ok: false, error: result.error })
        continue
      }

      const sentAt = new Date().toISOString()
      await db
        .from("drafts")
        .update({
          metadata: {
            ...baseMeta,
            dab_blog_id: result.dabBlogId,
            dab_status: result.dabStatus,
            dab_category: result.dabCategory,
            dab_registered_at: result.registeredAt,
            dab_mode: result.mode,
            dab_send_status: "sent",
            dab_send_at: sentAt,
            dab_send_scheduled_at: null,
            dab_send_error: null,
          },
        })
        .eq("id", draft.id)
      results.push({ draftId: draft.id, ok: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await db
        .from("drafts")
        .update({
          metadata: {
            ...(draft.metadata ?? {}),
            dab_send_status: "failed",
            dab_send_error: msg,
            dab_send_scheduled_at: null,
          },
        })
        .eq("id", draft.id)
      results.push({ draftId: draft.id, ok: false, error: msg })
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    ts: now,
  })
}
