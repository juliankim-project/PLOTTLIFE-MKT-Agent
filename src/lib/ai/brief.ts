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
  quality?: "flash" | "pro"
  /** 사용자가 본문 형태를 강제 — 자동(undefined) 또는 3가지 중 1개 */
  forcedTemplate?: "steps" | "compare" | "story"
}

interface GeneratedBrief {
  title: string
  slug: string
  primary_keyword: string
  secondary_keywords: string[]
  target_kpi: "conversion" | "traffic" | "dwell_time"
  /** 본문 구조 템플릿 — steps(가이드) / compare(비교·추천) / story(스토리·Q&A) */
  template?: "steps" | "compare" | "story"
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

[📐 템플릿 — ${input.forcedTemplate ? `**사용자가 \"${input.forcedTemplate}\" 강제 지정**` : "3가지 중 1개를 선택해 outline 구성"}]
${input.forcedTemplate
  ? `사용자가 \`${input.forcedTemplate}\` 템플릿으로 강제 지정함. 다른 템플릿 선택 금지.\n응답의 \`template\` 필드에는 반드시 \`"${input.forcedTemplate}"\` 만 작성.`
  : "주제와 카테고리 성격에 맞춰 아래 3가지 템플릿 중 가장 자연스러운 것을 선택하고, 그 구조로 H2/H3 를 짜라. **매번 같은 패턴 반복 금지** — 주제마다 다른 호흡으로."}

▸ **A. 가이드형 (Steps)** — 절차·체크리스트·실행이 핵심인 주제 (입주 가이드, 비자, ARC, 계약 등)
   구조: ① 왜 알아야 하나(훅) → ② Step 1 → Step 2 → Step 3 → ③ 실행 체크리스트 → ④ 플라트 라이프 차별점 (마무리)

▸ **B. 비교/추천형 (Compare)** — 선택지 비교·추천이 핵심 (동네 추천, 매물 비교, 옵션 비교)
   구조: ① 고민 지점(훅) → ② 후보 A vs B vs C 비교 → ③ 상황별 추천 (페르소나·예산별) → ④ 플라트 라이프 차별점

▸ **C. 스토리/Q&A형 (Story)** — 경험·후기·질문이 핵심 (입주 후기, 생활 팁, FAQ, 트러블슈팅)
   구조: ① 실제 사례·질문(훅) → ② 어떤 일이 있었나 / 자주 묻는 것 → ③ 인사이트·답 → ④ 플라트 라이프 차별점

[규칙]
- 한 가지 템플릿 골라 그대로 따라가되, 헤딩 문구는 주제에 맞게 자연스럽게 작성 (절대 "Step 1", "비교", "스토리" 같은 메타 단어 그대로 쓰지 마)
- 어떤 템플릿이든 마지막은 플라트 라이프 차별점 (보증금 0원/1주 단기/다국어/거주숙소제공확인서) 으로 자연 브리지
- H2 3~4개 + H3 0~2개 수준으로 **간결하게**
- H2 est_words **300~450**, H3 **150~250** (총 2200~3000자). 분량 부풀리기 금지

키워드는 실제 네이버·구글에서 검색될 것 같은 것 위주. primary 1개 + secondary 3~5개.

응답에 어떤 템플릿을 선택했는지 \`template\` 필드로 반환할 것 ("steps" | "compare" | "story").

응답은 반드시 아래 JSON 스키마 (다른 텍스트·코드블록 금지):

{
  "title": "최종 제목 (SEO 친화적, 50자 이내)",
  "slug": "url-slug-한글-허용",
  "primary_keyword": "가장 중요한 검색어",
  "secondary_keywords": ["보조 검색어1", "보조 검색어2"],
  "target_kpi": "conversion|traffic|dwell_time",
  "template": "steps|compare|story",
  "tone_guide": "이 글 특화 톤 한 문단 (선택한 템플릿 성격 반영 — Steps 면 단계별 차분, Compare 면 분석적, Story 면 1인칭 친근)",
  "outline": [
    {
      "heading": "H2 제목 (질문문 or 인용구)",
      "level": 2,
      "bullets": ["핵심 포인트 1", "핵심 포인트 2"],
      "est_words": 350
    },
    {
      "heading": "H3 서브 섹션 (① ② ③)",
      "level": 3,
      "bullets": ["..."],
      "est_words": 180
    }
  ],
  "cta_hints": ["마무리 섹션에서 언급할 플라트 라이프 서비스 포인트 1~2개 (브랜드명은 항상 '플라트 라이프' 공백 포함 풀네임)"],
  "est_length": "2200~3000자"
}`

  const result = await runAgent({
    agentSlug: "content-strategist",
    stage: "topic",
    projectId: input.projectId,
    prompt,
    temperature: 0.4,
    maxTokens: 10000,
    json: true,
    modelOverride: input.quality === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash",
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
    /* forcedTemplate 가 있으면 무조건 그 값. 없으면 LLM 응답 → 폴백 "steps" */
    template: input.forcedTemplate ?? (
      ["steps", "compare", "story"].includes(parsed.template ?? "")
        ? parsed.template
        : "steps"
    ),
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
    est_length: String(parsed.est_length ?? "2200~3000자"),
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
        /* template 정보를 tone_guide 에 prefix 로 박아 writer 까지 전달
           (별도 컬럼 추가 없이 outline 다양화 효과 유지) */
        tone_guide: brief.template
          ? `[구조: ${brief.template === "steps" ? "단계 가이드" : brief.template === "compare" ? "비교 추천" : "스토리·Q&A"}] ${brief.tone_guide}`
          : brief.tone_guide,
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
