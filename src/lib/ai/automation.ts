/**
 * Full-pipeline 자동화 — 1개 idea 부터 검수 완료까지 한 번에.
 *
 * 흐름: idea → brief → draft → review → status=approved
 *
 * - drafts.metadata.automation_run_id 로 자동화 실행 흔적 보존
 * - 단계별 실패 시 그 시점에서 abort + 에러 반환
 * - 이미지 생성은 옵션 (디폴트 false — 시간/비용 절약)
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"
import { generateAndStoreBrief } from "./brief"
import { writeAndStoreDraft } from "./writer"
import { analyzeAndStoreReview } from "./review"

export interface FullRunInput {
  projectId: string
  /** 명시적 idea — 없으면 shortlisted 중 fit_score 최고로 자동 선택 */
  ideaId?: string
  /** 본문 형태 — auto 또는 3가지 강제 */
  forcedTemplate?: "steps" | "compare" | "story"
  /** Flash 또는 Pro */
  quality?: "flash" | "pro"
}

export interface FullRunResult {
  ok: boolean
  runId: string
  ideaId: string
  topicId?: string
  draftId?: string
  reviewId?: string
  /** 마지막 도달 단계 */
  stage: "selecting" | "brief" | "writing" | "reviewing" | "approving" | "done"
  durationMs: number
  /** 실패 시 메시지 */
  error?: string
  /** 단계별 소요 시간 */
  steps: {
    brief?: number
    write?: number
    review?: number
  }
}

/**
 * 전체 파이프라인 1회 실행. 단계별 메트릭 + drafts.metadata 에 자동화 흔적.
 */
export async function runFullPipelineFromIdea(input: FullRunInput): Promise<FullRunResult> {
  const db = supabaseAdmin()
  const t0 = Date.now()
  const runId = `auto_${Date.now()}_${Math.floor(Math.random() * 9000) + 1000}`
  const result: FullRunResult = {
    ok: false,
    runId,
    ideaId: input.ideaId ?? "",
    stage: "selecting",
    durationMs: 0,
    steps: {},
  }

  try {
    /* ─── STEP 0: idea 선택 (자동) ─── */
    let ideaId = input.ideaId
    if (!ideaId) {
      const { data: candidates } = await db
        .from("ideas")
        .select("id, fit_score")
        .eq("project_id", input.projectId)
        .eq("status", "shortlisted")
        .order("fit_score", { ascending: false })
        .limit(1)
      if (!candidates || candidates.length === 0) {
        result.error = "shortlisted idea 가 없어요. 02 아이데이션에서 먼저 선정해주세요."
        return finish(result, t0)
      }
      ideaId = candidates[0].id as string
    }
    result.ideaId = ideaId

    /* ─── STEP 1: 브리프 ─── */
    result.stage = "brief"
    const briefT0 = Date.now()
    const briefResult = await generateAndStoreBrief({
      projectId: input.projectId,
      ideaId,
      forcedTemplate: input.forcedTemplate,
      quality: input.quality,
    })
    result.topicId = briefResult.topic.id
    result.steps.brief = Date.now() - briefT0

    /* ─── STEP 2: 본문 작성 ─── */
    result.stage = "writing"
    const writeT0 = Date.now()
    const writeResult = await writeAndStoreDraft({
      projectId: input.projectId,
      topicId: briefResult.topic.id,
      quality: input.quality,
    })
    result.draftId = writeResult.draft.id
    result.steps.write = Date.now() - writeT0

    /* drafts.metadata 에 automation_run_id 기록 */
    const baseMeta = (writeResult.draft.metadata as Record<string, unknown> | null) ?? {}
    await db
      .from("drafts")
      .update({
        metadata: { ...baseMeta, automation_run_id: runId },
      })
      .eq("id", writeResult.draft.id)

    /* ─── STEP 3: 검수 ─── */
    result.stage = "reviewing"
    const reviewT0 = Date.now()
    const reviewResult = await analyzeAndStoreReview({
      projectId: input.projectId,
      draftId: writeResult.draft.id,
      quality: input.quality,
    })
    result.reviewId = reviewResult.reviewId
    result.steps.review = Date.now() - reviewT0

    /* ─── STEP 4: status=approved 로 (콘텐츠 관리에 노출) ─── */
    result.stage = "approving"
    await db
      .from("drafts")
      .update({
        status: "approved",
        progress_pct: 100,
        updated_at: new Date().toISOString(),
      })
      .eq("id", writeResult.draft.id)

    result.stage = "done"
    result.ok = true
    return finish(result, t0)
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err)
    return finish(result, t0)
  }
}

function finish(r: FullRunResult, t0: number): FullRunResult {
  r.durationMs = Date.now() - t0
  return r
}
