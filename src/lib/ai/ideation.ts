/**
 * Ideation — 3축 Compass (목적·세그먼트·상황) + 자연어 검색 → 주제 30개 생성 + DB insert.
 * Content Strategist 에이전트에게 JSON 모드로 요청.
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"
import { runAgent } from "./agents"
import { isAllowedSource, groupSources } from "./source-format"
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

/** 각 intent 별 주제 짜는 각도 + 좋은/나쁜 예 — LLM 이 intent 를 정확히 구분하게 */
const INTENT_ANGLE: Record<Intent, { angle: string; good: string; bad: string; badReason: string }> = {
  discover: {
    angle: "처음 검색하는 사람이 던지는 큰 질문에 답. 정의·개관·전체 그림.",
    good: "외국인 유학생이 한국에서 단기임대 구하는 법 — 비자별 가이드",
    bad: "왜 우리가 1위인가",
    badReason: "(이건 advocate)",
  },
  convince: {
    angle: "둘셋 후보 사이에서 망설이는 사람을 결단으로. 비교·기준·트레이드오프.",
    good: "기숙사 vs 단기임대 vs 고시원 — 외국인 유학생에 뭐가 맞나",
    bad: "ARC 발급 절차",
    badReason: "(이건 enable)",
  },
  enable: {
    angle: "이미 결정한 사람에게 다음 한 발자국. 절차·체크리스트·실행 가이드.",
    good: "도착 첫 주 체크리스트 — ARC, 휴대폰 개통, 보험 가입",
    bad: "어떤 동네가 좋나",
    badReason: "(이건 discover)",
  },
  retain: {
    angle: "이미 살고 있는 사람에게 만족도 ↑. 라이프스타일·동네·일상 팁.",
    good: "단기임대 거주자가 자주 가는 홍대 카페 5곳 — 와이파이·가성비",
    bad: "한국 입주 절차",
    badReason: "(이건 enable)",
  },
  advocate: {
    angle: "떠나거나 떠날 사람에게 다음·추천. 회상·연결·재방문 동기.",
    good: "한 학기 살아본 후 — 다음 학기 또 오고 싶은 이유",
    bad: "처음 한국 오는 법",
    badReason: "(이건 discover)",
  },
}

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
    `## 목적 (Intent) — 각 주제는 반드시 **하나의 intent 에 정확히 매칭**, 다른 intent 영역 침범 금지\n` +
      intents
        .map((id) => {
          const d = INTENT_DEFS[id]
          const angle = INTENT_ANGLE[id]
          return `▸ ${d.id} · ${d.emoji} ${d.ko}\n   각도: ${angle.angle}\n   ✅ 좋은 예: "${angle.good}"\n   ❌ 나쁜 예: "${angle.bad}" ${angle.badReason}`
        })
        .join("\n\n")
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
    .select("id, params")
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

  /* ─── STEP 1: Grounded 시장 신호 수집 ─────────────────────────
     축들을 1~2줄로 압축해 짧은 grounded prompt → 트렌드/실제 검색 패턴 수집.
     ※ Read-only — ideas 본문 텍스트는 절대 변경하지 않음. STEP 2 컨텍스트로만 사용. */
  const segmentSummary = personaRows.length > 0
    ? personaRows.map((p) => p.label).join(", ")
    : "외국인 유학생·주재원·노마드·한달살기·내국인 이사"
  const intentSummary = (input.intents ?? []).map((i) => INTENT_DEFS[i]?.ko ?? i).join(", ")
  const stageSummary = (input.journeyStages ?? []).map((s) => STAGE_DEFS[s]?.ko ?? s).join(", ")
  const seasonSummary = pickDefs(SEASONS, input.seasons).map((s) => s.ko).join(", ")
  const painSummary = pickDefs(PAIN_TAGS, input.painTags).map((p) => p.ko).join(", ")
  const queryHint = input.searchQuery?.trim() ? `검색 의도: "${input.searchQuery.trim()}"` : ""

  const signalContext = [
    `타겟: ${segmentSummary}`,
    intentSummary && `목적: ${intentSummary}`,
    stageSummary && `여정: ${stageSummary}`,
    seasonSummary && `시즌: ${seasonSummary}`,
    painSummary && `Pain: ${painSummary}`,
    queryHint,
  ].filter(Boolean).join(" / ")

  const signalPrompt = `한국 단기임대 블로그 주제 발굴을 위해 다음 축의 최근 시장 신호를 검색해 정리해줘.

[축]
${signalContext}

[검색해서 수집할 것 — 8~12줄로 압축]
- 최근 6~12개월 떠오르는 검색 키워드
- 외국인·유학생·노마드 커뮤니티에서 자주 나오는 질문 패턴 (Reddit/Quora)
- 신학기·관광 시즌 등 시즌성 트렌드
- 정부·공식 통계의 최신 수치 (외국인 유입, 임대 시장 등)
- 새 법령·정책 변화 (2025~2026)

[허용 출처 — 화이트리스트만]
✅ 정부·공공기관(.go.kr, .or.kr) · 법령 DB · 학술(.ac.kr) · 위키 · 주요 뉴스 · Reddit·Quora · OECD/UN
❌ 호텔/리조트/OTA/타사 단기임대·부동산 중개업체

각 신호는 한 줄, "신호 — 출처 매체·연도" 형식. 8~12줄로.`

  let signalText = ""
  let signalPublishers: string[] = []
  try {
    const sigResult = await runAgent({
      agentSlug: "content-strategist",
      stage: "ideation",
      projectId: input.projectId,
      prompt: signalPrompt,
      temperature: 0.3,
      maxTokens: 2500,
      json: false,
      grounded: true,
      modelOverride: "gemini-2.5-flash",
    })
    signalText = sigResult.text
    /* 화이트리스트 필터 + 매체별 그룹화 */
    const rawSources = sigResult.sources ?? []
    const allowed = rawSources.filter((s) => isAllowedSource(s))
    signalPublishers = groupSources(allowed).slice(0, 8).map((g) => g.publisher)
    if (rawSources.length !== allowed.length) {
      console.log(
        `[ideation] signal sources filtered: ${rawSources.length} → ${allowed.length}`
      )
    }
  } catch (err) {
    /* signal 수집 실패해도 주제 생성은 진행 */
    console.warn("[ideation] signal step failed:", err instanceof Error ? err.message : err)
  }

  /* STEP 2 컨텍스트 — 짧은 prefix 로 주입 */
  const signalBlock = signalText && signalPublishers.length > 0
    ? `\n\n## 🔥 Google Search 로 수집한 최신 시장 신호 (반드시 반영)\n${signalText}\n\n[참고 매체] ${signalPublishers.join(" · ")}\n\n위 신호들을 ideas.signal_kind/signal_detail/related_keywords 에 자연스럽게 녹여라.`
    : ""

  const prompt = `플라트라이프(한국 단기임대 플랫폼) 블로그용 주제 **정확히 ${count}개** 를 생성해줘.
⚠️ 응답의 \`ideas\` 배열은 **반드시 길이 ${count}** — 더 적거나 더 많이 만들면 안 됨.

${segmentBlock}

${compassBlock}${contextBlock}${signalBlock}

## 🎯 필수 원칙 (모든 주제 공통 — 위반하면 그 주제는 폐기)

1. **플라트 전환 깔때기 정렬**
   모든 주제는 검색→탐색→활동→유입→전환 깔때기에서 한 단계.
   주제 자체에서 "플라트라이프" 라는 단어는 박지 말되, 답이 향하는 사람은
   결국 플라트 단기임대 후보 고객이어야 함.

2. **타사명·타사 사례 직접 언급 절대 금지**
   - ❌ "야놀자 vs 에어비앤비 비교" / "켄싱턴호텔 후기"
   - ✅ "단기임대 플랫폼 비교 — 어떤 기준으로 골라야 하나"
   - ✅ "단기숙소 vs 호텔 — 외국인 한 달 살이는?" (카테고리·일반명사만)

3. **우리 산업·서비스 영역만 다룸**
   허용: 단기임대 시장 / 외국인 유학생·주재원·노마드·내국인 이사
        비자(D-2/D-4/E/F-1)·ARC·거주숙소제공확인서 / 한국 거주 라이프
   금지: 호텔·관광 추천 / 음식·여행 가이드 / 비자 무관 일반 콘텐츠

4. **데이터 부족·허위 추측 금지**
   - ❌ "외국인 유학생 90%가 보증금 분쟁 경험" (출처 없음)
   - ✅ "외국인 유학생의 보증금 분쟁 사례와 예방법" (검증된 후 본문에서)

## 요구사항
- 각 주제는 위 축들을 조합한 구체적 롱테일 주제여야 함
- 각 주제는 반드시 "cluster"(여정) + "intent"(목적) 두 축을 모두 지정
- **각 주제의 intent 가 다른 intent 영역을 침범하면 안 됨** (위 INTENT 가이드의 좋은/나쁜 예 엄격 적용)
- 선택된 여정 단계·목적에 고르게 분산
- 플라트 매물(단기임대·보증금 0원·ARC 발급·1주 단기·다국어) 서비스와 자연스럽게 연결
- 한국어 제목

## 응답 형식 (반드시 아래 JSON 스키마 — 다른 설명·주석·코드블록 금지)

⚠️ \`ideas\` 배열의 길이는 **정확히 ${count}** 여야 함. 아래는 형식 예시 (실제 응답에서는 ${count}개 모두 채울 것).

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
    },
    {
      "title": "외국인 유학생 ARC 발급 전 첫 주 체크리스트",
      "cluster": "arrive",
      "intent": "enable",
      "rationale": "...",
      "volume": 12000,
      "fit_score": 85,
      "signal_kind": "evergreen",
      "signal_detail": "...",
      "related_keywords": ["ARC 발급", "외국인 등록", "첫 주 체크리스트"]
    }
    /* ... 위 형식으로 정확히 ${count}개의 idea 객체를 ideas 배열에 채울 것 ... */
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
    if (cleaned.length < count) {
      console.warn(
        `[ideation] LLM returned ${cleaned.length}/${count} ideas — example pattern bias 의심`
      )
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

    /* 시장 신호 보존 — UI 헤더에서 노출 (ideas 본문에는 안 들어감) */
    const groundedSignals = signalText
      ? {
          text: signalText,
          publishers: signalPublishers,
          generated_at: new Date().toISOString(),
        }
      : null

    const baseParams = (run.params as Record<string, unknown> | null) ?? {}
    await db
      .from("ideation_runs")
      .update({
        status: "succeeded",
        completed_at: new Date().toISOString(),
        params: {
          ...baseParams,
          grounded_signals: groundedSignals,
        },
      })
      .eq("id", run.id)

    return {
      runId: run.id,
      agent: result.agent,
      provider: result.provider,
      model: result.model,
      durationMs: result.durationMs,
      count: inserted?.length ?? 0,
      ideas: inserted ?? [],
      groundedSignals,
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
