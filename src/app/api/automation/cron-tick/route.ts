/**
 * Vercel Cron 워커 — 매시간 호출.
 * automation_schedules 의 enabled + due 항목 실행 → 다음 next_run_at 갱신.
 *
 * vercel.json 의 schedule "0 * * * *" (매시간 정각) 와 짝.
 *
 * 인증:
 * - CRON_SECRET 환경변수 설정 시 Authorization: Bearer 검증
 * - 미설정 시 우회 (로컬/dev)
 */

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"
import { runFullPipelineFromIdea } from "@/lib/ai/automation"
import { nextRunFromCron } from "@/lib/automation/schedule"
import type { AutomationSchedule } from "@/lib/automation/schedule"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const BATCH_LIMIT = 5

export async function GET(req: Request) { return handle(req) }
export async function POST(req: Request) { return handle(req) }

async function handle(req: Request) {
  /* 인증 */
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get("authorization") ?? ""
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 })
    }
  }

  const db = supabaseAdmin()
  const now = new Date().toISOString()

  /* due 항목 가져오기 */
  const { data, error } = await db
    .from("automation_schedules")
    .select("*")
    .eq("enabled", true)
    .lte("next_run_at", now)
    .limit(BATCH_LIMIT)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  const due = (data ?? []) as AutomationSchedule[]
  if (due.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, ts: now })
  }

  const results: Array<{ scheduleId: string; ok: boolean; draftId?: string; error?: string }> = []

  for (const sch of due) {
    /* next_run_at 미리 갱신 — 같은 schedule 동시 중복 실행 방지 */
    const nextAt = (() => {
      try {
        return nextRunFromCron(sch.cron_expression).toISOString()
      } catch {
        return null
      }
    })()

    if (!nextAt) {
      /* cron 잘못됨 — disable */
      await db
        .from("automation_schedules")
        .update({ enabled: false, last_error: "invalid cron" })
        .eq("id", sch.id)
      results.push({ scheduleId: sch.id, ok: false, error: "invalid cron — disabled" })
      continue
    }

    await db
      .from("automation_schedules")
      .update({ next_run_at: nextAt, updated_at: now })
      .eq("id", sch.id)

    /* 실제 실행 */
    try {
      const r = await runFullPipelineFromIdea({
        projectId: sch.project_id,
        forcedTemplate: sch.forced_template ?? undefined,
        quality: sch.quality,
      })

      /* 결과 기록 */
      await db
        .from("automation_schedules")
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: r.ok ? "succeeded" : "failed",
          last_draft_id: r.draftId ?? null,
          last_error: r.ok ? null : (r.error ?? null),
          run_count: sch.run_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sch.id)

      results.push({
        scheduleId: sch.id,
        ok: r.ok,
        draftId: r.draftId,
        error: r.ok ? undefined : r.error,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      await db
        .from("automation_schedules")
        .update({
          last_run_at: new Date().toISOString(),
          last_run_status: "failed",
          last_error: msg.slice(0, 500),
          updated_at: new Date().toISOString(),
        })
        .eq("id", sch.id)
      results.push({ scheduleId: sch.id, ok: false, error: msg })
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    succeeded: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    ts: now,
    results,
  })
}
