/**
 * Brief — 주제선정 단계. 확정된 1개 idea 에 대해
 *   Content Strategist 에이전트가 작성에 필요한 상세 브리프 생성.
 * topics 테이블에 persist.
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"
import { runAgent } from "./agents"
import { styleGuideForPrompt } from "../blog-style"

interface BriefInput {
  projectId: string
  ideaId: string
  targetKpi?: "conversion" | "traffic" | "dwell_time"
}

interface GeneratedBrief {
  title: string
  slug: string
  primary_keyword: string
  secondary_keywords: string[]
  target_kpi: "conversion" | "traffic" | "dwell_time"
  tone_guide: string
  outline: Array<{
    heading: string
    level: 2 | 3
    bullets: string[]
    est_words?: number
  }>
  cta_hints: string[]
  est_length: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60)
}

export async function generateAndStoreBrief(input: BriefInput) {
  const db = supabaseAdmin()

  // idea 로드
  const { data: idea, error: ideaErr } = await db
    .from("ideas")
    .select("id, title, cluster, rationale, volume, fit_score, signal, related_keywords, persona_id, project_id")
    .eq("id", input.ideaId)
    .single()
  if (ideaErr || !idea) throw new Error(`idea not found: ${ideaErr?.message}`)

  // persona 조회
  let personaLabel = "외국인 게스트"
  if (idea.persona_id) {
    const { data: p } = await db
      .from("personas")
      .select("label, description")
      .eq("id", idea.persona_id)
      .maybeSingle()
    if (p) personaLabel = p.label
  }

  // 이미 해당 idea 로 topic 이 있으면 반환
  const { data: existing } = await db
    .from("topics")
    .select("*")
    .eq("idea_id", input.ideaId)
    .maybeSingle()
  if (existing && existing.title) {
    return { topic: existing, reused: true as const }
  }

  const styleGuide = styleGuideForPrompt()

  const prompt = `다음 주제 아이디어를 작성 단계에 넘길 수 있는 '블로그 브리프'로 구체화해줘.

[주제 아이디어]
- 제목 초안: ${idea.title}
- 여정 단계: ${idea.cluster ?? "—"}
- 타겟 페르소나: ${personaLabel}
- 추천 근거: ${idea.rationale ?? "—"}
- 예상 월간 검색량: ${idea.volume ?? "—"}
- 관련 키워드: ${(idea.related_keywords ?? []).join(", ") || "—"}
- 시그널: ${idea.signal?.kind ?? "—"} — ${idea.signal?.detail ?? ""}

[타겟 KPI]
${input.targetKpi ?? "auto — 여정 단계와 근거를 보고 conversion/traffic/dwell_time 중 판단"}

${styleGuide}

[요구사항]
이 주제로 실제 블로그 본문을 작성할 Copywriter 에이전트에게 넘길 상세 브리프를 JSON 으로 작성해줘.
아웃라인은 H2 3~5개 + 각 H2 하위 H3 0~3개 수준으로, 플라트 블로그 스타일 구조(훅→문제→비교→해결 Step→CTA)를 따라야 함.
키워드는 실제 네이버·구글에서 검색될 것 같은 것 위주. primary 1개 + secondary 3~5개.

응답은 반드시 아래 JSON 스키마 (다른 텍스트·코드블록 금지):

{
  "title": "최종 제목 (SEO 친화적, 50자 이내)",
  "slug": "url-slug-한글-허용",
  "primary_keyword": "가장 중요한 검색어",
  "secondary_keywords": ["보조 검색어1", "보조 검색어2"],
  "target_kpi": "conversion|traffic|dwell_time",
  "tone_guide": "이 글 특화 톤 한 문단 (예: 친근한 1:1 상담 톤, 법률·숫자 근거 제시, 끝은 플라트 서비스로 연결)",
  "outline": [
    {
      "heading": "H2 제목 (질문문 or 인용구)",
      "level": 2,
      "bullets": ["핵심 포인트 1", "핵심 포인트 2"],
      "est_words": 500
    },
    {
      "heading": "H3 서브 섹션 (① ② ③)",
      "level": 3,
      "bullets": ["..."],
      "est_words": 200
    }
  ],
  "cta_hints": ["마무리 섹션에서 언급할 플라트 서비스 포인트 1~2개"],
  "est_length": "3200~3800자"
}`

  const result = await runAgent({
    agentSlug: "content-strategist",
    stage: "topic",
    projectId: input.projectId,
    prompt,
    temperature: 0.4,
    maxTokens: 10000,
    json: true,
  })

  const parsed = result.json as GeneratedBrief | undefined
  if (!parsed || !parsed.title || !Array.isArray(parsed.outline)) {
    throw new Error("브리프 생성 실패 — JSON 스키마 불일치")
  }

  const brief: GeneratedBrief = {
    title: String(parsed.title).slice(0, 200),
    slug: parsed.slug ? slugify(parsed.slug) : slugify(parsed.title),
    primary_keyword: String(parsed.primary_keyword ?? "").slice(0, 100),
    secondary_keywords: Array.isArray(parsed.secondary_keywords)
      ? parsed.secondary_keywords.slice(0, 8).map((x) => String(x).slice(0, 80))
      : [],
    target_kpi: ["conversion", "traffic", "dwell_time"].includes(parsed.target_kpi)
      ? parsed.target_kpi
      : "traffic",
    tone_guide: String(parsed.tone_guide ?? ""),
    outline: parsed.outline.slice(0, 20).map((o) => ({
      heading: String(o.heading ?? "").slice(0, 200),
      level: o.level === 3 ? 3 : 2,
      bullets: Array.isArray(o.bullets) ? o.bullets.slice(0, 8).map((b) => String(b).slice(0, 200)) : [],
      est_words: typeof o.est_words === "number" ? o.est_words : undefined,
    })),
    cta_hints: Array.isArray(parsed.cta_hints)
      ? parsed.cta_hints.slice(0, 5).map((x) => String(x).slice(0, 200))
      : [],
    est_length: String(parsed.est_length ?? "3000~4000자"),
  }

  // topics insert (또는 idea_id 기준 upsert)
  const { data: topic, error: topicErr } = await db
    .from("topics")
    .upsert(
      {
        project_id: input.projectId,
        idea_id: input.ideaId,
        title: brief.title,
        slug: brief.slug,
        primary_keyword: brief.primary_keyword,
        secondary_keywords: brief.secondary_keywords,
        target_kpi: brief.target_kpi,
        persona_id: idea.persona_id ?? null,
        // 도입부 시점 매칭용 — Copywriter 가 읽어서 독자 POV 를 맞춤
        journey_stage: idea.cluster ?? null,
        outline: brief.outline,
        cta_hints: brief.cta_hints,
        tone_guide: brief.tone_guide,
        brief: brief.est_length,
        score: {
          fit: idea.fit_score ?? 0,
          volume: idea.volume ?? 0,
        },
        status: "draft",
        stage_limit: "3",
        finalized_at: null,
      },
      { onConflict: "project_id,idea_id" }
    )
    .select()
    .single()
  if (topicErr || !topic) throw new Error(`topics insert: ${topicErr?.message}`)

  // idea 를 promoted 로
  await db.from("ideas").update({ status: "promoted" }).eq("id", input.ideaId)

  return {
    topic,
    reused: false as const,
    provider: result.provider,
    model: result.model,
    durationMs: result.durationMs,
  }
}
