/**
 * Ideation — 게스트 여정 기반 주제 30개 생성 + DB insert.
 * Content Strategist 에이전트에게 JSON 모드로 요청.
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"
import { runAgent } from "./agents"

const SIGNAL_KINDS = [
  "seo-gap",
  "top-performer",
  "seasonal",
  "competitor-miss",
  "search-rising",
  "evergreen",
] as const
type SignalKind = (typeof SIGNAL_KINDS)[number]

const CLUSTERS = [
  "consider",
  "prepare",
  "arrive",
  "settle",
  "live",
  "explore",
  "change",
] as const
type Cluster = (typeof CLUSTERS)[number]

interface GeneratedIdea {
  title: string
  cluster: Cluster
  rationale: string
  volume?: number | null
  fit_score?: number | null
  signal_kind: SignalKind
  signal_detail: string
  related_keywords?: string[]
}

interface GenInput {
  projectId: string
  personaSlug?: string
  personaLabel?: string
  count?: number
  temperature?: number
  researchContext?: string
}

export async function generateAndStoreIdeas(input: GenInput) {
  const db = supabaseAdmin()
  const count = Math.min(Math.max(input.count ?? 30, 5), 50)

  // 페르소나 조회 (optional)
  let personaRow: { id: string; label: string } | null = null
  if (input.personaSlug) {
    const { data } = await db
      .from("personas")
      .select("id, label")
      .eq("project_id", input.projectId)
      .eq("slug", input.personaSlug)
      .maybeSingle()
    if (data) personaRow = data
  }

  // ideation_run 생성
  const { data: run, error: runErr } = await db
    .from("ideation_runs")
    .insert({
      project_id: input.projectId,
      persona_id: personaRow?.id ?? null,
      params: {
        count,
        temperature: input.temperature ?? 0.7,
        personaSlug: input.personaSlug,
      },
      status: "running",
    })
    .select("id")
    .single()
  if (runErr || !run) throw new Error(`ideation_runs insert: ${runErr?.message}`)

  // 프롬프트 구성
  const personaLine = personaRow
    ? `타겟 페르소나: ${personaRow.label}.`
    : input.personaLabel
    ? `타겟 페르소나: ${input.personaLabel}.`
    : "페르소나를 밸런스 있게 분산(유학생·주재원·노마드·한달살기·내국인 이사)."

  const contextBlock = input.researchContext
    ? `\n\n리서치 컨텍스트:\n${input.researchContext}`
    : ""

  const prompt = `플라트라이프(한국 단기임대 플랫폼) 블로그용 주제 ${count}개를 생성해줘.

${personaLine}${contextBlock}

요구사항:
- 게스트 여정 7단계(consider·prepare·arrive·settle·live·explore·change)에 고르게 분산
- 각 주제는 실제 검색되는 롱테일 키워드 기반
- 플라트 매물(단기임대·보증금 0원·ARC 발급 등) 서비스와 자연스럽게 연결
- 한국어 제목

응답은 반드시 아래 JSON 스키마로만 (다른 설명·주석·코드블록 금지):

{
  "ideas": [
    {
      "title": "보증금 0원 단기임대 추천 TOP 10 — 서울 전 지역",
      "cluster": "prepare",
      "rationale": "외국인 유학생 첫 숙소 예약 단계에서 가장 큰 불안 요소 해소. 플라트 매물 직접 연결.",
      "volume": 34000,
      "fit_score": 92,
      "signal_kind": "search-rising",
      "signal_detail": "'보증금 없는 단기임대' +45% MoM",
      "related_keywords": ["보증금 없는 방", "보증금 0원", "no deposit Seoul"]
    }
  ]
}

cluster 는 [${CLUSTERS.join(", ")}] 중 하나.
signal_kind 는 [${SIGNAL_KINDS.join(", ")}] 중 하나.
volume 은 예상 월간 검색량(정수). 모르면 null.
fit_score 는 0~100 정수 (페르소나·플라트 매물 매칭도).
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
    })

    type ParsedShape = { ideas?: GeneratedIdea[] }
    const parsed = (result.json as ParsedShape | undefined) ?? null
    if (!parsed || !Array.isArray(parsed.ideas)) {
      // JSON 파싱 실패 시 재시도 없이 바로 실패 처리
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
        cluster: (CLUSTERS.includes(i.cluster) ? i.cluster : "consider") as Cluster,
        rationale: String(i.rationale ?? ""),
        volume: typeof i.volume === "number" ? i.volume : null,
        fit_score:
          typeof i.fit_score === "number"
            ? Math.max(0, Math.min(100, Math.round(i.fit_score)))
            : null,
        signal_kind: (SIGNAL_KINDS.includes(i.signal_kind)
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

    // Bulk insert
    const { data: inserted, error: insErr } = await db
      .from("ideas")
      .insert(
        cleaned.map((i) => ({
          project_id: input.projectId,
          ideation_run_id: run.id,
          title: i.title,
          cluster: i.cluster,
          persona_id: personaRow?.id ?? null,
          rationale: i.rationale,
          volume: i.volume,
          fit_score: i.fit_score,
          signal: { kind: i.signal_kind, detail: i.signal_detail },
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
