/**
 * Ideation — 3축 Compass (목적·세그먼트·상황) + 자연어 검색 → 주제 30개 생성 + DB insert.
 * Content Strategist 에이전트에게 JSON 모드로 요청.
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"
import { runAgent } from "./agents"
import {
  INTENTS,
  INTENT_DEFS,
  JOURNEY_STAGES,
  STAGE_DEFS,
  SEASONS,
  LIFE_TRIGGERS,
  PAIN_TAGS,
  type Intent,
  type JourneyStage,
} from "@/lib/ideation/compass"

const SIGNAL_KINDS = [
  "seo-gap",
  "top-performer",
  "seasonal",
  "competitor-miss",
  "search-rising",
  "evergreen",
] as const
type SignalKind = (typeof SIGNAL_KINDS)[number]

interface GeneratedIdea {
  title: string
  cluster: JourneyStage
  intent: Intent
  rationale: string
  volume?: number | null
  fit_score?: number | null
  signal_kind: SignalKind
  signal_detail: string
  related_keywords?: string[]
}

export interface CompassInput {
  /** 목적(Intent) — 선택된 것만. 비어있으면 모든 intent 고르게 분산 */
  intents?: Intent[]
  /** 세그먼트 — persona slug 복수 선택 */
  segmentSlugs?: string[]
  /** 여정 단계 — 선택된 것만. 비어있으면 8단계 고르게 분산 */
  journeyStages?: JourneyStage[]
  /** 시즌 태그 id */
  seasons?: string[]
  /** 라이프 트리거 태그 id */
  lifeTriggers?: string[]
  /** Pain / 서비스 레버 태그 id */
  painTags?: string[]
}

export interface GenInput extends CompassInput {
  projectId: string
  /** 자연어 질의 or 키워드 목록 — 비어있으면 순수 3축 모드 */
  searchQuery?: string
  searchMode?: "sentence" | "keyword"
  count?: number
  temperature?: number
  /** 리서치에서 넘어온 키워드 자유 텍스트 (하위 호환) */
  researchContext?: string
  /** 품질 모드 — flash(기본) · pro(고품질) */
  quality?: "flash" | "pro"
}

function pickDefs<T extends { id: string }>(list: readonly T[], ids?: string[]): T[] {
  if (!ids || ids.length === 0) return []
  const set = new Set(ids)
  return list.filter((x) => set.has(x.id))
}

function buildCompassBlock(input: CompassInput & { searchQuery?: string; searchMode?: string }): string {
  const parts: string[] = []

  /* 목적 */
  const intents = input.intents && input.intents.length > 0 ? input.intents : INTENTS.slice()
  parts.push(
    `## 목적 (Intent) — 이 중에서 고르게 분산 (각 주제 1개씩 지정)\n` +
      intents
        .map((id) => {
          const d = INTENT_DEFS[id]
          return `- ${d.id} · ${d.emoji} ${d.ko} · ${d.desc}`
        })
        .join("\n")
  )

  /* 여정 단계 */
  const stages = input.journeyStages && input.journeyStages.length > 0 ? input.journeyStages : JOURNEY_STAGES.slice()
  parts.push(
    `## 여정 단계 (cluster) — 이 중에서 고르게 분산\n` +
      stages
        .map((id) => {
          const d = STAGE_DEFS[id]
          return `- ${d.id} · ${d.emoji} ${d.ko} (${d.en}) · ${d.shortDesc}`
        })
        .join("\n")
  )

  /* 세그먼트는 호출부에서 persona label로 별도 주입 */

  /* 시즌 */
  const seasons = pickDefs(SEASONS, input.seasons)
  if (seasons.length > 0) {
    parts.push(
      `## 시즌 (달력 기반 타이밍) — 주제에 반영\n` +
        seasons.map((s) => `- ${s.ko}${s.hint ? " · " + s.hint : ""}${s.evergreen ? " (상시 evergreen — 계절 무관 롱테일 포함)" : ""}`).join("\n")
    )
  }

  /* 라이프 트리거 */
  const triggers = pickDefs(LIFE_TRIGGERS, input.lifeTriggers)
  if (triggers.length > 0) {
    parts.push(
      `## 라이프 트리거 (개인 상황 이벤트)\n` +
        triggers.map((t) => `- ${t.ko}${t.hint ? " · " + t.hint : ""}`).join("\n")
    )
  }

  /* Pain / 서비스 레버 */
  const pains = pickDefs(PAIN_TAGS, input.painTags)
  if (pains.length > 0) {
    parts.push(
      `## Pain Point / 플라트 서비스 레버 (자연스럽게 연결)\n` +
        pains.map((p) => `- ${p.ko}${p.isServiceLever ? " (🎯 플라트 차별점)" : ""}`).join("\n")
    )
  }

  /* 자연어 검색 */
  if (input.searchQuery && input.searchQuery.trim()) {
    const q = input.searchQuery.trim()
    if (input.searchMode === "keyword") {
      parts.push(
        `## 🎯 핵심 키워드 (반드시 반영)\n이 키워드(들) 중심으로 확장:\n"${q}"\n각 주제 제목에 이 키워드 또는 유사 변형이 들어가면 좋음.`
      )
    } else {
      parts.push(
        `## 🎯 독자 질문/상황 (가장 중요)\n독자가 검색창/머릿속에서 던지는 질문:\n"${q}"\n\n이 질문에 답하는 주제들을 만들어. 단, 위의 목적·여정·세그먼트 조합에 따라 각 주제의 각도를 다르게.`
      )
    }
  }

  return parts.join("\n\n")
}

export async function generateAndStoreIdeas(input: GenInput) {
  const db = supabaseAdmin()
  const count = Math.min(Math.max(input.count ?? 30, 5), 50)

  /* 세그먼트(페르소나) 조회 — 복수 */
  let personaRows: { id: string; slug: string; label: string; description: string | null }[] = []
  if (input.segmentSlugs && input.segmentSlugs.length > 0) {
    const { data } = await db
      .from("personas")
      .select("id, slug, label, description")
      .eq("project_id", input.projectId)
      .in("slug", input.segmentSlugs)
    if (data) personaRows = data
  }

  /* ideation_run 생성 */
  const { data: run, error: runErr } = await db
    .from("ideation_runs")
    .insert({
      project_id: input.projectId,
      persona_id: personaRows[0]?.id ?? null, // 첫번째 세그먼트를 대표로 (UI용)
      params: {
        count,
        temperature: input.temperature ?? 0.7,
        intents: input.intents ?? null,
        segmentSlugs: input.segmentSlugs ?? null,
        journeyStages: input.journeyStages ?? null,
        seasons: input.seasons ?? null,
        lifeTriggers: input.lifeTriggers ?? null,
        painTags: input.painTags ?? null,
        searchQuery: input.searchQuery ?? null,
        searchMode: input.searchMode ?? null,
      },
      status: "running",
    })
    .select("id")
    .single()
  if (runErr || !run) throw new Error(`ideation_runs insert: ${runErr?.message}`)

  /* 세그먼트 블록 */
  let segmentBlock = ""
  if (personaRows.length > 0) {
    segmentBlock =
      `## 세그먼트 (복수 타깃 — 전체에 고르게 분산)\n` +
      personaRows.map((p) => `- ${p.label}${p.description ? ` (${p.description})` : ""}`).join("\n")
  } else {
    segmentBlock = `## 세그먼트\n- 밸런스 있게 분산 (유학생·주재원·노마드·한달살기·내국인 이사)`
  }

  const compassBlock = buildCompassBlock(input)

  const contextBlock = input.researchContext
    ? `\n\n## 리서치 컨텍스트 (이 키워드들을 자연스럽게 녹여)\n${input.researchContext}`
    : ""

  const prompt = `플라트라이프(한국 단기임대 플랫폼) 블로그용 주제 ${count}개를 생성해줘.

${segmentBlock}

${compassBlock}${contextBlock}

## 요구사항
- 각 주제는 위 축들을 조합한 구체적 롱테일 주제여야 함
- 각 주제는 반드시 "cluster"(여정) + "intent"(목적) 두 축을 모두 지정
- 선택된 여정 단계·목적에 고르게 분산
- 플라트 매물(단기임대·보증금 0원·ARC 발급·1주 단기·다국어) 서비스와 자연스럽게 연결
- 한국어 제목

## 응답 형식 (반드시 아래 JSON 스키마 — 다른 설명·주석·코드블록 금지)

{
  "ideas": [
    {
      "title": "보증금 0원 단기임대 추천 TOP 10 — 서울 전 지역",
      "cluster": "prepare",
      "intent": "enable",
      "rationale": "외국인 유학생 첫 숙소 예약 단계에서 가장 큰 불안 요소 해소. 플라트 매물 직접 연결.",
      "volume": 34000,
      "fit_score": 92,
      "signal_kind": "search-rising",
      "signal_detail": "'보증금 없는 단기임대' +45% MoM",
      "related_keywords": ["보증금 없는 방", "보증금 0원", "no deposit Seoul"]
    }
  ]
}

cluster 는 [${JOURNEY_STAGES.join(", ")}] 중 하나.
intent 는 [${INTENTS.join(", ")}] 중 하나.
signal_kind 는 [${SIGNAL_KINDS.join(", ")}] 중 하나.
volume 은 예상 월간 검색량(정수). 모르면 null.
fit_score 는 0~100 정수 (세그먼트·플라트 매물·목적 매칭도).
related_keywords 는 3~5개.`

  try {
    const result = await runAgent({
      agentSlug: "content-strategist",
      stage: "ideation",
      projectId: input.projectId,
      prompt,
      temperature: input.temperature ?? 0.7,
      maxTokens: 8000,
      json: true,
      modelOverride: input.quality === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash",
    })

    type ParsedShape = { ideas?: GeneratedIdea[] }
    const parsed = (result.json as ParsedShape | undefined) ?? null
    if (!parsed || !Array.isArray(parsed.ideas)) {
      await db
        .from("ideation_runs")
        .update({ status: "failed", error: "JSON 파싱 실패", completed_at: new Date().toISOString() })
        .eq("id", run.id)
      throw new Error("AI 응답이 JSON 스키마에 맞지 않습니다")
    }

    const cleaned: GeneratedIdea[] = parsed.ideas
      .filter((i) => i && typeof i.title === "string" && typeof i.cluster === "string")
      .map((i) => ({
        title: i.title,
        cluster: ((JOURNEY_STAGES as readonly string[]).includes(i.cluster) ? i.cluster : "consider") as JourneyStage,
        intent: ((INTENTS as readonly string[]).includes(i.intent) ? i.intent : "discover") as Intent,
        rationale: String(i.rationale ?? ""),
        volume: typeof i.volume === "number" ? i.volume : null,
        fit_score:
          typeof i.fit_score === "number"
            ? Math.max(0, Math.min(100, Math.round(i.fit_score)))
            : null,
        signal_kind: ((SIGNAL_KINDS as readonly string[]).includes(i.signal_kind)
          ? i.signal_kind
          : "evergreen") as SignalKind,
        signal_detail: String(i.signal_detail ?? ""),
        related_keywords: Array.isArray(i.related_keywords) ? i.related_keywords.slice(0, 8) : [],
      }))

    if (cleaned.length === 0) {
      await db
        .from("ideation_runs")
        .update({ status: "failed", error: "유효 주제 0개", completed_at: new Date().toISOString() })
        .eq("id", run.id)
      throw new Error("유효한 주제가 생성되지 않았습니다")
    }

    /* Bulk insert — intent 는 signal jsonb 안에 함께 저장 */
    const { data: inserted, error: insErr } = await db
      .from("ideas")
      .insert(
        cleaned.map((i) => ({
          project_id: input.projectId,
          ideation_run_id: run.id,
          title: i.title,
          cluster: i.cluster,
          persona_id: personaRows[0]?.id ?? null,
          rationale: i.rationale,
          volume: i.volume,
          fit_score: i.fit_score,
          signal: {
            kind: i.signal_kind,
            detail: i.signal_detail,
            intent: i.intent,
          },
          related_keywords: i.related_keywords,
          status: "draft",
        }))
      )
      .select("id, title, cluster, rationale, volume, fit_score, signal, related_keywords, status, created_at")

    if (insErr) {
      await db
        .from("ideation_runs")
        .update({ status: "failed", error: insErr.message, completed_at: new Date().toISOString() })
        .eq("id", run.id)
      throw new Error(`ideas insert: ${insErr.message}`)
    }

    await db
      .from("ideation_runs")
      .update({ status: "succeeded", completed_at: new Date().toISOString() })
      .eq("id", run.id)

    return {
      runId: run.id,
      agent: result.agent,
      provider: result.provider,
      model: result.model,
      durationMs: result.durationMs,
      count: inserted?.length ?? 0,
      ideas: inserted ?? [],
    }
  } catch (err) {
    await db
      .from("ideation_runs")
      .update({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id)
    throw err
  }
}
