/**
 * Review — 검수 에이전트.
 * 주어진 draft 의 body_markdown 을 받아 3개 카테고리(SEO / 팩트·출처 / 톤 & 브랜드)로
 * 세부 체크 항목을 콘텐츠 맞춤으로 생성·평가해 reviews 테이블에 저장.
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"
import { runAgent } from "./agents"
import { isAllowedSource, groupSources } from "./source-format"
import type { GroundingSource } from "./provider"

const CATEGORIES = ["SEO", "팩트·출처", "톤 & 브랜드"] as const
type Category = (typeof CATEGORIES)[number]

interface ReviewItem {
  label: string
  ok: boolean
  severity?: "info" | "warning" | "error"
  detail?: string
  suggestion?: string
}

interface ReviewCategory {
  cat: Category
  score: number
  items: ReviewItem[]
}

interface SourceCheck {
  urls_found: number
  suspicious_urls: string[]
  missing_citations: string[]
  date_inconsistencies: string[]
  overall_note?: string
}

/** 본문 주장의 grounded 검증 결과 — 검수 UI 전용. 본문에 절대 노출 X */
type FactCheckStatus = "VERIFIED" | "PARTIAL" | "CONTRADICTED" | "UNVERIFIABLE"
interface FactCheck {
  /** 본문에서 추출한 사실 주장 (수치·법령·절차·기관 등) */
  claim: string
  status: FactCheckStatus
  /** 검증 출처 — 기관·연도. status 가 UNVERIFIABLE 이면 비어있음 */
  source?: string
  /** PARTIAL/CONTRADICTED 일 때 보완 설명 */
  note?: string
}

interface AnalysisResult {
  overall_score: number
  summary: string
  categories: ReviewCategory[]
  source_check: SourceCheck
  fact_checks?: FactCheck[]
}

export interface ReviewInput {
  projectId: string
  draftId: string
  quality?: "flash" | "pro"
}

export async function analyzeAndStoreReview(input: ReviewInput) {
  const db = supabaseAdmin()

  const { data: draft, error: draftErr } = await db
    .from("drafts")
    .select("id, project_id, title, body_markdown, primary_keyword, secondary_keywords, topic_id, metadata")
    .eq("id", input.draftId)
    .single()
  if (draftErr || !draft) throw new Error(`draft not found: ${draftErr?.message}`)
  if (!draft.body_markdown || draft.body_markdown.length < 200)
    throw new Error("본문이 비어있거나 너무 짧아 검수할 수 없어요 (200자 이상 필요)")

  /* topic 로드 (선택사항 — outline·cta_hints 참고) */
  let topic: { outline?: unknown[]; primary_keyword?: string; secondary_keywords?: string[]; cta_hints?: string[] } | null = null
  if (draft.topic_id) {
    const { data } = await db
      .from("topics")
      .select("outline, primary_keyword, secondary_keywords, cta_hints, target_kpi")
      .eq("id", draft.topic_id)
      .maybeSingle()
    topic = data ?? null
  }

  /* 현재 날짜 — 시기성 체크용 */
  const today = new Date().toISOString().slice(0, 10)

  /* ─── STEP 1: Grounded fact-check ─────────────────────────────
     본문의 핵심 사실 주장을 Google Search 로 재검증.
     ※ Read-only — 본문(body_markdown)은 절대 수정하지 않음.
     ※ 결과는 STEP 2 컨텍스트로만 주입되며, drafts.body_markdown 에 흘러갈 경로 없음. */
  const factCheckPrompt = `다음 한국 단기임대 블로그 본문에서 검증 가능한 **사실 주장 5~7개**를 추출하고, 각각을 Google Search 로 검증해주세요.

[본문 — 검증 대상]
${draft.body_markdown.slice(0, 6000)}

[추출 기준]
- 검증 가능한 명시적 사실만 (수치, 법령, 절차, 기관 공지, 일정 등)
- 의견·감정·CTA 표현은 제외
- 각 주장은 본문에서 인용한 짧은 문장으로

[검증 출처 — 화이트리스트만]
✅ 정부·공공기관(.go.kr, .or.kr) · 법령 DB · 학술(.ac.kr) · 위키 · 주요 뉴스 · Reddit/Quora · OECD/UN
❌ 호텔/리조트(켄싱턴·롯데·신라 등) · OTA(야놀자·여기어때·에어비앤비 등) · 타사 단기임대·중개업체

[응답 형식 — 줄당 한 주장]
[VERIFIED] 주장 — 출처 기관·연도
[PARTIAL] 주장 — 출처 + 차이/조건
[CONTRADICTED] 주장 — 출처 + 어떻게 다른지
[UNVERIFIABLE] 주장 — 공식 출처 없음

5~7줄로 압축. 다른 설명 없이 위 형식만.`

  let factCheckText = ""
  let factCheckSources: GroundingSource[] = []
  try {
    const fcResult = await runAgent({
      agentSlug: "seo-auditor",
      stage: "review",
      projectId: input.projectId,
      prompt: factCheckPrompt,
      temperature: 0.2,
      maxTokens: 3000,
      json: false,
      grounded: true,
      modelOverride: "gemini-2.5-flash",
    })
    factCheckText = fcResult.text
    /* 화이트리스트 필터 — 출처에 타사 약관 등 섞이지 않게 */
    const rawSources = fcResult.sources ?? []
    factCheckSources = rawSources.filter((s) => isAllowedSource(s))
    if (rawSources.length !== factCheckSources.length) {
      console.log(
        `[review] fact-check sources filtered: ${rawSources.length} → ${factCheckSources.length}`
      )
    }
  } catch (err) {
    /* fact-check 실패해도 종합 검수는 진행 */
    console.warn("[review] fact-check step failed:", err instanceof Error ? err.message : err)
  }

  /* fact-check 컨텍스트 — STEP 2 prompt 에 주입 */
  const factCheckContext = factCheckText
    ? `\n[STEP 0: Google Search 로 검증한 본문 사실 주장 — 검수 점수에 반영]\n${factCheckText}\n\n반드시 위 검증 결과를 \`fact_checks\` 배열에 그대로 정리해 응답에 포함하고, "팩트·출처" 카테고리 score 산정에도 반영하세요.\n────────────\n\n`
    : ""

  const prompt = `${factCheckContext}다음 **플라트 라이프** (한국 단기임대 플랫폼, 공식 표기는 공백 포함 "플라트 라이프") 블로그 본문을 **검수**해주세요.

오늘 날짜: ${today}

## 대상 콘텐츠
- 제목: ${draft.title}
- 주요 키워드: ${draft.primary_keyword ?? topic?.primary_keyword ?? "(미지정)"}
- 서브 키워드: ${(draft.secondary_keywords ?? topic?.secondary_keywords ?? []).join(", ") || "(없음)"}
${topic?.cta_hints?.length ? `- CTA 힌트: ${topic.cta_hints.join(" · ")}` : ""}

## 본문
${draft.body_markdown}

## 검수 지시

3개 카테고리별로 **콘텐츠 맞춤 세부 체크 항목**을 생성하고 각각 평가하세요. 각 카테고리당 4~6개 항목.

### 카테고리
1. **SEO**: 제목·메타·H1/H2/H3 구조·키워드 밀도·내부링크·이미지 alt 등. 이 콘텐츠 고유 상황 반영.
2. **팩트·출처**:
   - 언급된 수치·통계·법령·절차의 **출처 표기 여부**
   - URL 이나 기관명이 있는 경우 **신뢰성**(공식 도메인 kr.go.kr / 공식 기관인지)
   - **허위 정보 징후** (존재하지 않는 법령, 실존하지 않는 기관·서비스·제도, 과장된 수치)
   - **시기 정합성** (올해 ${today.slice(0, 4)}년 기준 오래된 정보, "2025년 기준" 같은 표기 검증)
   - **단기임대·비자·ARC·거주숙소제공확인서** 등 도메인 특화 사실 관계
3. **톤 & 브랜드**: 플라트 라이프 보이스(~예요·~돼요), 금지어(거든요·답니다), 난이도(외국인 유학생 기준), CTA 자연스러움
   - **브랜드 표기**: 본문에 등장하는 브랜드명이 모두 **"플라트 라이프"** (공백 포함) 풀네임인지 확인. ❌ "플라트라이프"(붙여) / ❌ "플라트"(단독·줄임) 발견 시 **반드시 감점 + 수정 요청**

### 출처 체크
본문 전체를 훑어 아래 리스트를 만드세요:
- **urls_found**: 등장하는 URL 총 개수
- **suspicious_urls**: 공식 도메인이 아니거나 의심스러운 URL (배열)
- **missing_citations**: 출처 없이 주장된 수치·통계·법령·제도 (배열, 짧은 문구)
- **date_inconsistencies**: 시기/날짜 정합성 의심 지점 (배열)

## 응답 형식 (반드시 JSON — 다른 설명·주석·코드블록 금지)

{
  "overall_score": 0~100 정수,
  "summary": "한 줄 요약 — 발행 가능성 판단 + 주요 이슈",
  "categories": [
    {
      "cat": "SEO",
      "score": 0~100 정수,
      "items": [
        {
          "label": "짧은 체크 항목 문구",
          "ok": true|false,
          "severity": "info"|"warning"|"error",
          "detail": "문제/관찰 내용 간단히",
          "suggestion": "수정 제안 (ok=false 일 때)"
        }
      ]
    },
    {"cat": "팩트·출처", "score": ..., "items": [...]},
    {"cat": "톤 & 브랜드", "score": ..., "items": [...]}
  ],
  "source_check": {
    "urls_found": 0,
    "suspicious_urls": [],
    "missing_citations": [],
    "date_inconsistencies": [],
    "overall_note": "출처 관련 종합 코멘트 한 줄"
  },
  "fact_checks": [
    {
      "claim": "본문에서 인용한 사실 주장 한 문장",
      "status": "VERIFIED" | "PARTIAL" | "CONTRADICTED" | "UNVERIFIABLE",
      "source": "검증 출처 (기관·연도) — UNVERIFIABLE 이면 빈 문자열",
      "note": "PARTIAL/CONTRADICTED 일 때 보완 설명 (그 외 빈 문자열)"
    }
  ]
}

⚠️ 중요:
- 의심 신호가 전혀 없으면 빈 배열·0 으로 채우세요. severity 는 ok=false 일 때만 필수.
- \`fact_checks\` 는 위 [STEP 0] 검증 결과를 그대로 옮기되, status 가 PARTIAL/CONTRADICTED 인 항목은 \`note\` 를 반드시 채울 것.
- \`fact_checks\` 값은 검수자에게만 보이는 내부 데이터이며 본문(body_markdown)에 절대 삽입되지 않음.`

  const result = await runAgent({
    agentSlug: "seo-auditor",
    stage: "review",
    projectId: input.projectId,
    prompt,
    temperature: 0.2,
    maxTokens: 16000,
    json: true,
    modelOverride: input.quality === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash",
  })

  const parsed = result.json as AnalysisResult | undefined
  if (
    !parsed ||
    typeof parsed.overall_score !== "number" ||
    !Array.isArray(parsed.categories) ||
    parsed.categories.length === 0
  ) {
    /* 잘림 등 파싱 실패 시 raw 응답 일부를 에러에 포함 → 디버깅 */
    const rawHead = (result.text ?? "").slice(0, 120).replace(/\s+/g, " ").trim()
    const rawTail = (result.text ?? "").slice(-120).replace(/\s+/g, " ").trim()
    throw new Error(
      `검수 응답이 JSON 스키마에 맞지 않아요 — 다시 실행하거나 Pro 모드로 시도해 보세요.\n(응답 앞: "${rawHead}…" / 응답 끝: "…${rawTail}")`
    )
  }

  /* categories 를 items flat 배열(기존 DB schema)로 직렬화 */
  const flatItems = parsed.categories.flatMap((c) =>
    c.items.map((i) => ({
      cat: c.cat,
      label: i.label,
      ok: i.ok,
      severity: i.severity ?? (i.ok ? "info" : "warning"),
      detail: i.detail ?? null,
      suggestion: i.suggestion ?? null,
    }))
  )

  /* fact_checks 정규화 — 알 수 없는 status 는 UNVERIFIABLE 로 강등 */
  const allowedStatuses = new Set<FactCheckStatus>(["VERIFIED", "PARTIAL", "CONTRADICTED", "UNVERIFIABLE"])
  const factChecks: FactCheck[] = Array.isArray(parsed.fact_checks)
    ? parsed.fact_checks
        .filter((f): f is FactCheck => !!f && typeof f.claim === "string" && f.claim.trim().length > 0)
        .map((f) => ({
          claim: f.claim.trim(),
          status: allowedStatuses.has(f.status) ? f.status : "UNVERIFIABLE",
          source: f.source?.trim() || undefined,
          note: f.note?.trim() || undefined,
        }))
        .slice(0, 12) // 최대 12개
    : []

  /* fact-check 검증에 사용한 출처 — 매체별 그룹화 (UI 카드용) */
  const factCheckPublishers = groupSources(factCheckSources)
    .slice(0, 8)
    .map((g) => g.publisher)

  /* reviews 저장 — 기존 동일 draft review 가 있으면 최신만 유지 (soft upsert) */
  await db.from("reviews").delete().eq("draft_id", input.draftId)
  const { data: saved, error: insErr } = await db
    .from("reviews")
    .insert({
      project_id: input.projectId,
      draft_id: input.draftId,
      items: {
        flat: flatItems,
        categories: parsed.categories,
        source_check: parsed.source_check,
        summary: parsed.summary,
        fact_checks: factChecks,
        fact_check_publishers: factCheckPublishers,
      },
      overall_score: Math.max(0, Math.min(100, Math.round(parsed.overall_score))),
      status: "pending",
      reviewer: result.agent.slug,
    })
    .select()
    .single()
  if (insErr) throw new Error(`reviews insert: ${insErr.message}`)

  return {
    reviewId: saved.id,
    agent: result.agent,
    model: result.model,
    durationMs: result.durationMs,
    overall_score: parsed.overall_score,
    summary: parsed.summary,
    categories: parsed.categories,
    source_check: parsed.source_check,
    fact_checks: factChecks,
    fact_check_publishers: factCheckPublishers,
  }
}

/** 특정 draft 의 최신 review 불러오기 */
export async function getLatestReview(draftId: string) {
  const db = supabaseAdmin()
  const { data } = await db
    .from("reviews")
    .select("*")
    .eq("draft_id", draftId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  return data
}
