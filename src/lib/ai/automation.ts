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
    /* ─── STEP 0: idea 선택 (자동) — 다양성 weight ─── */
    let ideaId = input.ideaId
    let forcedTemplate = input.forcedTemplate
    if (!ideaId) {
      const picked = await pickDiverseIdea(input.projectId)
      if (!picked) {
        result.error = "shortlisted idea 가 없어요. 02 아이데이션에서 먼저 선정해주세요."
        return finish(result, t0)
      }
      ideaId = picked
    }
    result.ideaId = ideaId

    /* template 자동 선택 — 최근 10편 중 적게 쓰인 것 우선 */
    if (!forcedTemplate) {
      forcedTemplate = await pickDiverseTemplate(input.projectId)
    }

    /* ─── STEP 1: 브리프 ─── */
    result.stage = "brief"
    const briefT0 = Date.now()
    const briefResult = await generateAndStoreBrief({
      projectId: input.projectId,
      ideaId,
      forcedTemplate,
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

/* ════════════════════════════════════════════════════════════════
   다양성 선택 — 같은 cluster·intent·template 가 연속 반복되지 않게
   ════════════════════════════════════════════════════════════════ */

/**
 * idea 후보 풀 보장 — shortlisted 가 부족하면 자동 ideation 호출.
 * 호출 시점: shortlisted 가 N개 미만일 때.
 */
async function ensureCandidatePool(projectId: string, minCount = 3): Promise<void> {
  const db = supabaseAdmin()
  const { count, error } = await db
    .from("ideas")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("status", "shortlisted")
  if (error) {
    console.warn("[automation] candidate count failed:", error.message)
    return
  }
  if ((count ?? 0) >= minCount) return

  /* 부족 — 자동 ideation 호출 */
  console.log(`[automation] only ${count ?? 0} shortlisted — auto-running ideation (10 ideas)`)
  try {
    const { generateAndStoreIdeas } = await import("./ideation")
    await generateAndStoreIdeas({
      projectId,
      count: 10,
      temperature: 0.85, // 다양성 살짝 ↑
      quality: "flash",
    })
    /* 새로 만든 ideas 는 status='draft'. pickDiverseIdea 가 후보로 받게 */
  } catch (err) {
    console.warn("[automation] auto-ideation failed:", err instanceof Error ? err.message : err)
  }
}

/**
 * idea 1개 선택 — 다양성 weight (cluster + intent + persona).
 * - 1차: shortlisted 후보. 부족하면 ensureCandidatePool 로 자동 ideation 후 draft 도 포함
 * - 최근 10편 콘텐츠의 cluster/intent/persona 분포 분석
 * - 페널티 합 가장 적은 idea 우선, 동률이면 fit_score 최고
 */
async function pickDiverseIdea(projectId: string): Promise<string | null> {
  const db = supabaseAdmin()

  /* 후보 풀 보장 — 부족하면 자동 ideation */
  await ensureCandidatePool(projectId, 3)

  /* 1차: shortlisted, 없으면 draft 도 포함 */
  let { data: candidates } = await db
    .from("ideas")
    .select("id, fit_score, cluster, signal, persona_id")
    .eq("project_id", projectId)
    .eq("status", "shortlisted")
    .order("fit_score", { ascending: false })
    .limit(50)
  if (!candidates || candidates.length === 0) {
    const fallback = await db
      .from("ideas")
      .select("id, fit_score, cluster, signal, persona_id")
      .eq("project_id", projectId)
      .eq("status", "draft")
      .order("fit_score", { ascending: false })
      .limit(50)
    candidates = fallback.data
  }
  if (!candidates || candidates.length === 0) return null

  /* 최근 10편 콘텐츠의 cluster/intent/persona 분포 */
  const { data: recent } = await db
    .from("drafts")
    .select("topic_id")
    .eq("project_id", projectId)
    .in("status", ["approved", "published", "drafting", "reviewing"])
    .order("created_at", { ascending: false })
    .limit(10)

  const topicIds = (recent ?? []).map((r) => r.topic_id).filter((x): x is string => !!x)
  const recentClusters = new Map<string, number>()
  const recentIntents = new Map<string, number>()
  const recentPersonas = new Map<string, number>()
  if (topicIds.length > 0) {
    const { data: topics } = await db
      .from("topics")
      .select("journey_stage, idea_id, persona_id")
      .in("id", topicIds)
    const topicIdeaIds = (topics ?? []).map((t) => t.idea_id).filter((x): x is string => !!x)
    let ideaSignalMap = new Map<string, { cluster?: string; intent?: string; persona_id?: string }>()
    if (topicIdeaIds.length > 0) {
      const { data: ideaInfos } = await db
        .from("ideas")
        .select("id, cluster, signal, persona_id")
        .in("id", topicIdeaIds)
      ideaSignalMap = new Map(
        (ideaInfos ?? []).map((i) => [
          i.id as string,
          {
            cluster: i.cluster as string | undefined,
            intent: ((i.signal as { intent?: string } | null) ?? {}).intent,
            persona_id: i.persona_id as string | undefined,
          },
        ])
      )
    }
    for (const t of topics ?? []) {
      const info = t.idea_id ? ideaSignalMap.get(t.idea_id as string) : undefined
      const cluster = info?.cluster ?? (t.journey_stage as string | undefined)
      const intent = info?.intent
      const personaId = info?.persona_id ?? (t.persona_id as string | undefined)
      if (cluster) recentClusters.set(cluster, (recentClusters.get(cluster) ?? 0) + 1)
      if (intent) recentIntents.set(intent, (recentIntents.get(intent) ?? 0) + 1)
      if (personaId) recentPersonas.set(personaId, (recentPersonas.get(personaId) ?? 0) + 1)
    }
  }

  /* 다양성 점수 — cluster + intent + persona 모두 페널티 */
  const scored = candidates.map((c) => {
    const cluster = c.cluster as string | undefined
    const intent = ((c.signal as { intent?: string } | null) ?? {}).intent
    const personaId = c.persona_id as string | undefined
    const clusterPenalty = cluster ? recentClusters.get(cluster) ?? 0 : 0
    const intentPenalty = intent ? recentIntents.get(intent) ?? 0 : 0
    const personaPenalty = personaId ? recentPersonas.get(personaId) ?? 0 : 0
    const diversityBonus = -(clusterPenalty + intentPenalty + personaPenalty) * 5
    return {
      id: c.id as string,
      score: (c.fit_score ?? 0) + diversityBonus,
    }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.id ?? null
}

/**
 * 본문 형태 자동 선택 — 최근 10편의 template 분포 보고 가장 적게 쓰인 것.
 */
async function pickDiverseTemplate(
  projectId: string
): Promise<"steps" | "compare" | "story"> {
  const db = supabaseAdmin()
  const { data: recent } = await db
    .from("topics")
    .select("tone_guide")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(10)

  const counts: Record<"steps" | "compare" | "story", number> = {
    steps: 0,
    compare: 0,
    story: 0,
  }
  for (const t of recent ?? []) {
    const tg = (t.tone_guide as string | null) ?? ""
    /* tone_guide prefix 패턴: "[구조: 단계 가이드]" / "[구조: 비교 추천]" / "[구조: 스토리·Q&A]" */
    if (tg.includes("단계 가이드")) counts.steps++
    else if (tg.includes("비교 추천")) counts.compare++
    else if (tg.includes("스토리")) counts.story++
  }

  /* 가장 적게 쓰인 것 선택 (동률이면 steps→compare→story 순 안정성 위해) */
  const order: Array<"steps" | "compare" | "story"> = ["steps", "compare", "story"]
  let best = order[0]
  for (const t of order) {
    if (counts[t] < counts[best]) best = t
  }
  return best
}
