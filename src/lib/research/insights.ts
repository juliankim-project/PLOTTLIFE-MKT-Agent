/**
 * Market Insights — 키워드 트렌드 페이지의 정성 인사이트 생성기.
 *
 * 정량 데이터(검색량·경쟁도) 옆에 "왜 지금 떠오르는지" 같은 맥락을
 * Google Search Grounding 으로 수집. 페이지에서 클릭 트리거.
 *
 * Read-only — DB 저장 안 함. UI 박스에서만 노출.
 */

import "server-only"
import { runAgent } from "@/lib/ai/agents"
import { isAllowedSource, groupSources } from "@/lib/ai/source-format"
import type { GroundingSource } from "@/lib/ai/provider"

export interface InsightInput {
  /** 분석 대상 카테고리 (예: "외국인·유학생", "지역·동네") */
  category?: string
  /** 상위 키워드 리스트 — 이 키워드들 기준으로 인사이트 도출 */
  topKeywords?: string[]
  /** 분석 범위 한 줄 — 페이지 컨텍스트 (예: "한국 단기임대 시장") */
  scope?: string
}

export interface MarketInsights {
  /** 트렌드 동향 — 왜 지금 떠오르는지 */
  trends: string[]
  /** 자주 나오는 사용자 질문·검색 의도 */
  questions: string[]
  /** 콘텐츠 갭 — 경쟁 콘텐츠가 안 다루는 각도 */
  gaps: string[]
  /** 화이트리스트 통과한 참고 매체 (그룹화된 publisher 명) */
  publishers: string[]
  /** 종합 한 줄 요약 */
  summary?: string
  /** 생성 시각 */
  generated_at: string
}

interface ParsedJson {
  trends?: unknown
  questions?: unknown
  gaps?: unknown
  summary?: unknown
}

function toStringArray(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return []
  return v
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, max)
}

export async function generateMarketInsights(input: InsightInput): Promise<MarketInsights> {
  const scope = input.scope ?? "한국 단기임대 시장"
  const category = input.category ?? "전체"
  const keywords = (input.topKeywords ?? []).slice(0, 10)
  const keywordLine = keywords.length > 0 ? keywords.join(", ") : "(미지정)"

  /* ─── STEP 1: Grounded 신호 수집 ───────────────────────────── */
  const signalPrompt = `${scope} 의 다음 카테고리·키워드들에 대해 최근 6~12개월의 시장 신호를 검색해 정리해줘.

[카테고리] ${category}
[상위 키워드] ${keywordLine}

[수집할 것 — 8~12줄]
- 왜 지금 이 키워드들이 떠오르는지 (시즌·이슈·정책)
- 외국인·유학생·노마드·내국인 이사 등 실수요자가 자주 던지는 질문 (Reddit/Quora/커뮤니티)
- 정부·통계 기관의 최신 데이터 (검색량 추이, 시장 규모, 정책 변화)

[허용 출처 — 화이트리스트만]
✅ 정부·공공(.go.kr, .or.kr) · 법령 DB · 학술(.ac.kr) · 위키 · 주요 뉴스 · Reddit·Quora
❌ 호텔/리조트/OTA/타사 단기임대·중개업체

각 신호는 한 줄, "신호 — 출처 매체·연도" 형식. 8~12줄로.`

  let signalText = ""
  let signalSources: GroundingSource[] = []
  try {
    const sigResult = await runAgent({
      agentSlug: "content-strategist",
      stage: "research",
      prompt: signalPrompt,
      temperature: 0.3,
      maxTokens: 2500,
      json: false,
      grounded: true,
      modelOverride: "gemini-2.5-flash",
    })
    signalText = sigResult.text
    const raw = sigResult.sources ?? []
    signalSources = raw.filter((s) => isAllowedSource(s))
    if (raw.length !== signalSources.length) {
      console.log(`[insights] sources filtered: ${raw.length} → ${signalSources.length}`)
    }
  } catch (err) {
    console.warn("[insights] STEP 1 failed:", err instanceof Error ? err.message : err)
  }

  const publishers = groupSources(signalSources).slice(0, 8).map((g) => g.publisher)

  /* ─── STEP 2: 정성 인사이트 정리 (json) ──────────────────── */
  const synthPrompt = `${signalText
    ? `[STEP 0: Google Search 로 수집된 시장 신호]\n${signalText}\n\n[참고 매체] ${publishers.join(" · ")}\n\n────────────\n\n`
    : ""}위 시장 신호를 바탕으로 ${scope} · ${category} 카테고리의 마케터용 정성 인사이트를 JSON 으로 정리해줘.

[키워드 컨텍스트]
${keywordLine}

[응답 형식 — 반드시 JSON, 다른 설명 금지]
{
  "trends": [
    "트렌드 동향 한 문장 — 왜 지금 떠오르는지 (시즌·이슈·정책)"
  ],
  "questions": [
    "실수요자가 자주 던지는 질문 한 문장"
  ],
  "gaps": [
    "경쟁 콘텐츠가 안 다루는 각도 한 문장"
  ],
  "summary": "전체 카테고리 한 줄 요약 — 마케터에게 가장 중요한 시그널"
}

각 배열 3~5개. 한국어. 간결하게. 타사 브랜드명·약관 절대 금지.`

  let parsed: ParsedJson | null = null
  try {
    const synth = await runAgent({
      agentSlug: "content-strategist",
      stage: "research",
      prompt: synthPrompt,
      temperature: 0.4,
      maxTokens: 2500,
      json: true,
      grounded: false,
      modelOverride: "gemini-2.5-flash",
    })
    parsed = (synth.json as ParsedJson | null) ?? null
  } catch (err) {
    console.warn("[insights] STEP 2 failed:", err instanceof Error ? err.message : err)
  }

  return {
    trends: toStringArray(parsed?.trends, 6),
    questions: toStringArray(parsed?.questions, 6),
    gaps: toStringArray(parsed?.gaps, 6),
    publishers,
    summary: typeof parsed?.summary === "string" ? parsed.summary.trim() : undefined,
    generated_at: new Date().toISOString(),
  }
}
