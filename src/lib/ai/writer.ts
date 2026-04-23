/**
 * Writer — Copywriter 에이전트가 브리프 기반으로 블로그 본문 1편 작성.
 *  레퍼런스 스타일 가이드 + 브리프 outline 을 프롬프트에 주입.
 *  drafts 테이블에 persist.
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"
import { runAgent } from "./agents"
import { styleGuideForPrompt } from "../blog-style"

interface WriteInput {
  projectId: string
  topicId: string
}

export async function writeAndStoreDraft(input: WriteInput) {
  const db = supabaseAdmin()

  // topic(브리프) 로드
  const { data: topic, error: topicErr } = await db
    .from("topics")
    .select("*")
    .eq("id", input.topicId)
    .single()
  if (topicErr || !topic) throw new Error(`topic not found: ${topicErr?.message}`)

  // 이미 draft 있으면 반환
  const { data: existing } = await db
    .from("drafts")
    .select("*")
    .eq("topic_id", input.topicId)
    .maybeSingle()
  if (existing && existing.body_markdown) {
    return { draft: existing, reused: true as const }
  }

  // 페르소나
  let personaLabel = "외국인 게스트"
  if (topic.persona_id) {
    const { data: p } = await db
      .from("personas")
      .select("label")
      .eq("id", topic.persona_id)
      .maybeSingle()
    if (p) personaLabel = p.label
  }

  const outlineBlock = (topic.outline ?? [])
    .map((o: { heading: string; level: number; bullets?: string[]; est_words?: number }) => {
      const prefix = o.level === 3 ? "  ###" : "##"
      const words = o.est_words ? ` (~${o.est_words}자)` : ""
      const bullets = (o.bullets ?? []).map((b: string) => `    - ${b}`).join("\n")
      return `${prefix} ${o.heading}${words}\n${bullets}`
    })
    .join("\n\n")

  const prompt = `플라트라이프(단기임대 플랫폼) 블로그 본문을 작성해줘.

[주제 브리프]
- 제목: ${topic.title}
- Primary 키워드: ${topic.primary_keyword}
- Secondary 키워드: ${(topic.secondary_keywords ?? []).join(", ")}
- 타겟 페르소나: ${personaLabel}
- 타겟 KPI: ${topic.target_kpi}
- 특화 톤 가이드: ${topic.tone_guide ?? "친근·실용적"}
- 목표 길이: ${topic.brief ?? "3000~4000자"}
- 마무리 CTA 포인트: ${(topic.cta_hints ?? []).join(" / ") || "—"}

[아웃라인 — 이 구조 그대로]
${outlineBlock}

${styleGuideForPrompt()}

[요구사항]
1. 위 아웃라인의 헤딩을 그대로 쓰고, 각 섹션을 자연스럽고 풍부하게 채워줘
2. Markdown 사용 (## H2, ### H3) — 표는 꼭 필요할 때만
3. 도입부는 아웃라인 첫 H2 앞에 2~3 문단으로 별도 작성 (훅 + 이 글을 읽으면 얻는 것 약속)
4. 통계·법률·숫자 근거가 있으면 본문에 자연스럽게 녹여라 (한국 임대차보호법 등)
5. 마지막 섹션은 반드시 플라트 서비스 차별점(다국어·보증금 0원·1주 단기·거주숙소제공확인서)을 자연스럽게 브리지
6. 문체는 친근한 구어체 (~예요 / ~ 돼요), 의문문 활용 적극적으로
7. 전체 ${topic.brief ?? "3000~4000자"} 범위 유지

응답은 **Markdown 본문만** 출력 (다른 설명·주석 금지). 제목(H1)은 포함하지 말고 도입부부터 시작해.`

  const result = await runAgent({
    agentSlug: "copywriter",
    stage: "write",
    projectId: input.projectId,
    prompt,
    temperature: 0.7,
    maxTokens: 10000,
    json: false,
  })

  let body = result.text.trim()
  // 혹시 앞에 H1이 딸려 오면 제거
  body = body.replace(/^#\s+.+\n+/, "")
  // 코드블록으로 감싸져 있으면 제거
  if (body.startsWith("```")) {
    body = body.replace(/^```(?:markdown)?\n/, "").replace(/\n```\s*$/, "")
  }

  const { data: draft, error: insErr } = await db
    .from("drafts")
    .insert({
      project_id: input.projectId,
      topic_id: input.topicId,
      title: topic.title,
      slug: topic.slug,
      content_type: "seo-longtail",
      target_kpi: topic.target_kpi,
      primary_keyword: topic.primary_keyword,
      secondary_keywords: topic.secondary_keywords,
      outline: topic.outline,
      body_markdown: body,
      status: "drafting",
      progress_pct: 80,
      metadata: {
        generated_by: result.agent,
        provider: result.provider,
        model: result.model,
        generated_at: new Date().toISOString(),
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
      },
    })
    .select()
    .single()
  if (insErr || !draft) throw new Error(`drafts insert: ${insErr?.message}`)

  return {
    draft,
    reused: false as const,
    provider: result.provider,
    model: result.model,
    durationMs: result.durationMs,
    charCount: body.length,
  }
}
