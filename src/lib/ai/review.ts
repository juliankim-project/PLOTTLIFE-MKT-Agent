/**
 * Review — 검수 에이전트.
 * 주어진 draft 의 body_markdown 을 받아 3개 카테고리(SEO / 팩트·출처 / 톤 & 브랜드)로
 * 세부 체크 항목을 콘텐츠 맞춤으로 생성·평가해 reviews 테이블에 저장.
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"
import { runAgent } from "./agents"

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

interface AnalysisResult {
  overall_score: number
  summary: string
  categories: ReviewCategory[]
  source_check: SourceCheck
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

  const prompt = `다음 플라트라이프(한국 단기임대 플랫폼) 블로그 본문을 **검수**해주세요.

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
3. **톤 & 브랜드**: 플라트라이프 보이스(~예요·~돼요), 금지어(거든요·답니다), 난이도(외국인 유학생 기준), CTA 자연스러움

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
  }
}

의심 신호가 전혀 없으면 빈 배열·0 으로 채우세요. severity 는 ok=false 일 때만 필수.`

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
