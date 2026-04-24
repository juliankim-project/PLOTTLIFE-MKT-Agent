/**
 * Writer — Copywriter 에이전트가 브리프 기반으로 블로그 본문 1편 작성.
 *  레퍼런스 스타일 가이드 + 브리프 outline 을 프롬프트에 주입.
 *  drafts 테이블에 persist.
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"
import { runAgent } from "./agents"
import { styleGuideForPrompt, povBlockForPrompt, JOURNEY_STAGE_POV, type JourneyStage } from "../blog-style"

interface WriteInput {
  projectId: string
  topicId: string
  quality?: "flash" | "pro"
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

  const stage = (topic.journey_stage ?? null) as JourneyStage | null
  const povBlock = povBlockForPrompt(stage)
  const stageLabel = stage && JOURNEY_STAGE_POV[stage]
    ? JOURNEY_STAGE_POV[stage].label
    : "(미지정)"

  const prompt = `플라트라이프(한국 단기임대 플랫폼) 블로그 본문을 작성해줘.

[주제 브리프]
- 제목: ${topic.title}
- 여정 단계: ${stageLabel}
- Primary 키워드: ${topic.primary_keyword}
- Secondary 키워드: ${(topic.secondary_keywords ?? []).join(", ")}
- 타겟 페르소나: ${personaLabel}
- 타겟 KPI: ${topic.target_kpi}
- 특화 톤 가이드: ${topic.tone_guide ?? "친근·실용적"}
- 목표 길이: ${topic.brief ?? "3000~4000자"}
- 마무리 CTA 포인트: ${(topic.cta_hints ?? []).join(" / ") || "—"}

[아웃라인 — 이 구조 그대로]
${outlineBlock}
${povBlock}
${styleGuideForPrompt({ withImageSlots: true })}

[출력 요구사항]
1. 위 아웃라인의 헤딩을 그대로 쓰고, 각 섹션을 자연스럽고 풍부하게 채워라
2. Markdown 사용 (## H2, ### H3) — 불릿 리스트 + 아래 시각 요소 적극 활용
3. 도입부는 아웃라인 첫 H2 앞에 2~3 문단으로 별도 작성 (훅 + 이 글을 읽으면 얻는 것 약속)
4. 통계·법률·숫자 근거가 있으면 본문에 자연스럽게 녹여라 (한국 임대차보호법 등). 수치 인용 시 **출처 기관/법령명** 병기
5. 마지막 섹션은 반드시 플라트라이프 서비스 차별점(보증금 0원 / 1주 단기 / 다국어 / 거주숙소제공확인서)을 자연스럽게 브리지
6. 스타일 가이드의 **필수 준수 10가지** 와 **금지어 리스트** 를 반드시 지켜라
7. 전체 ${topic.brief ?? "3000~4000자"} 범위 유지

[📊 시각 요소 활용 (본문이 덩어리 글이 되지 않도록 최소 2~3개 반드시 포함)]

a) **비교표** (1개) — 선택지가 2개 이상 나올 때 (예: 기숙사 vs 단기임대, 계약 1개월 vs 6개월).
   Markdown 테이블:
   | 항목 | 옵션 A | 옵션 B |
   |---|:---:|:---:|
   | 보증금 | 500만원 | **0원** |
   | 계약 기간 | 1년 | 1주~3개월 |

b) **콜아웃 박스** (2~4개) — 독자가 '이것만 기억하자' 지점에 blockquote 한 줄로. 반드시 이모지로 시작:
   > 💡 **팁**: 첫 달은 무조건 1개월 단기임대로 시작하세요. 동네를 익힌 뒤 1년 계약해도 늦지 않아요.
   > ⚠️ **주의**: 계약서 한국어 조항을 모르고 사인하면 보증금을 못 돌려받는 경우가 많아요.
   > ℹ️ **정보**: ARC 발급엔 보통 3~4주 걸립니다 (2026년 기준).
   > ✅ **체크**: 계약 전 아래 3가지를 꼭 확인하세요.

c) **체크리스트** (1개 이상) — 실행 아이템 나열할 때 \`- [ ]\` 형식:
   - [ ] 여권 + 사증 스캔본
   - [ ] 첫 달 숙소 예약 확인서
   - [ ] 보험 가입증명서

d) **강조 서머리** — 섹션 말미나 글 끝에 한 줄 서머리 blockquote:
   > ✅ **체크**: 외국인 유학생은 보증금 0원 + 1주 단위 단기임대로 시작하는 게 리스크가 가장 낮아요.

e) **구분선** (\`---\`) — 대주제 사이에 1~2회 사용 가능.

이들 요소는 **내용이 필요할 때만** 넣고, 형식에 맞춰 강제 삽입하지 말 것. 단 전체 본문에서 **최소 2~3개 이상**은 자연스럽게 녹일 것.

[이미지 슬롯 2개 삽입]
본문 중 독자가 한 번 쉬고 싶어할 자연스러운 지점 2곳에 아래 형식의 주석을 그대로 삽입:

<!-- IMAGE_SLOT_1: {해당 섹션 핵심을 시각적으로 표현하는 한국어 한 문장 설명} -->
<!-- IMAGE_SLOT_2: {다른 섹션 핵심을 시각적으로 표현하는 한국어 한 문장 설명} -->

슬롯 위치는 H2 섹션 사이의 빈 줄에. 설명은 실제 이미지를 떠올릴 수 있게 구체적으로.
예) <!-- IMAGE_SLOT_1: 서울 원룸의 밝은 거실에서 노트북으로 한국어 공부 중인 외국인 유학생의 일상 장면 -->

[응답 형식]
**Markdown 본문만** 출력. 다른 설명·주석·코드블록(\`\`\`markdown) 금지.
제목(H1)은 포함하지 말고 도입부부터 시작.`

  const result = await runAgent({
    agentSlug: "copywriter",
    stage: "write",
    projectId: input.projectId,
    prompt,
    temperature: 0.5,
    maxTokens: 10000,
    json: false,
    modelOverride: input.quality === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash",
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
