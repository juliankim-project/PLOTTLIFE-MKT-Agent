/**
 * Writer — Copywriter 에이전트가 브리프 기반으로 블로그 본문 1편 작성.
 *  레퍼런스 스타일 가이드 + 브리프 outline 을 프롬프트에 주입.
 *  drafts 테이블에 persist.
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"
import { runAgent } from "./agents"
import { styleGuideForPrompt, povBlockForPrompt, JOURNEY_STAGE_POV, type JourneyStage } from "../blog-style"
import { formatSourceSection, groupSources, isAllowedSource } from "./source-format"

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

  /* ─── STEP 1: Grounded fact-finding ─── */
  /* 짧고 명확한 prompt 로 Google Search 강제 트리거 */
  const factPrompt = `한국 단기임대 블로그 본문 작성을 위해 다음을 검색해 핵심 사실 5~8개로 정리해줘.

주제: "${topic.title}"
주요 키워드: ${topic.primary_keyword ?? "단기임대"}
타겟: ${personaLabel}

✅ 검색·인용 가능한 출처 (이것들만)
- 정부·공공기관 (.go.kr / .or.kr): 출입국·외국인청, 법무부, 국토교통부, 행정안전부, 교육부, 통계청, 한국부동산원, 한국임대차분쟁조정위원회, 한국관광공사
- 법령 DB: law.go.kr, easylaw.go.kr (주택임대차보호법, 출입국관리법 등)
- 학술·연구 (.ac.kr / .re.kr): 대학·국책연구원 발표, 학회 논문
- 위키: Wikipedia, 나무위키
- 주요 뉴스: 조선·중앙·동아·한겨레·연합뉴스·한경·매경·KBS·SBS·MBC·JTBC, NYT·BBC·Reuters 등
- 커뮤니티·Q&A: Reddit, Quora (외국인 유학생·체류자 실제 경험)
- 국제기구: OECD, UN, WHO, 세계은행

❌ 검색·인용 절대 금지 (법적 리스크 + 브랜드 일관성)
- 호텔·리조트 체인 (켄싱턴·롯데·신라·메리어트·힐튼 등)
- 숙박 OTA (야놀자·여기어때·에어비앤비·부킹닷컴·아고다·익스피디아 등)
- 타사 단기임대·렌탈 서비스 / 부동산 중개업체 광고·블로그
- 일반 기업 사이트의 약관·이용약관·개인정보처리방침 페이지

각 사실은 한 문장씩, 출처 기관·법령·연도와 함께. 5~8줄로 압축.`

  let factsText = ""
  let factSources: Array<{ title?: string; uri: string; domain?: string }> = []
  try {
    const factResult = await runAgent({
      agentSlug: "copywriter",
      stage: "write",
      projectId: input.projectId,
      prompt: factPrompt,
      temperature: 0.2,
      maxTokens: 2500,
      json: false,
      grounded: true,
      modelOverride: "gemini-2.5-flash",
    })
    factsText = factResult.text
    /* 출처 화이트리스트 적용 — 정부·공공·뉴스·위키·커뮤니티만 통과 */
    const rawSources = factResult.sources ?? []
    factSources = rawSources.filter((s) => isAllowedSource(s))
    if (rawSources.length !== factSources.length) {
      console.log(
        `[writer] sources filtered (whitelist): ${rawSources.length} → ${factSources.length}`
      )
    }
  } catch {
    /* fact step 실패해도 본문은 진행 */
  }

  /* prompt 컨텍스트용 — 매체별 그룹화된 출처명만 (LLM 에는 매체명만 있어도 충분) */
  const promptSourceList = groupSources(factSources)
    .slice(0, 8)
    .map((g) => `- ${g.publisher}`)
    .join("\n")

  const prompt = `${factsText && factSources.length > 0
    ? `[STEP 0: 위 단계에서 Google Search 로 수집된 최신 사실 — 본문에 자연스럽게 인용]\n${factsText}\n\n[참조한 출처 — 본문 끝 "참고 출처" 섹션에 자동 첨부됩니다]\n${promptSourceList}\n\n위 사실들을 활용해 아래 본문을 작성하세요.\n\n────────────────────────\n\n`
    : ""}플라트라이프(한국 단기임대 플랫폼) 블로그 본문을 작성해줘.

[주제 브리프]
- 제목: ${topic.title}
- 여정 단계: ${stageLabel}
- Primary 키워드: ${topic.primary_keyword}
- Secondary 키워드: ${(topic.secondary_keywords ?? []).join(", ")}
- 타겟 페르소나: ${personaLabel}
- 타겟 KPI: ${topic.target_kpi}
- 특화 톤 가이드: ${topic.tone_guide ?? "친근·실용적"}
- 목표 길이: ${topic.brief ?? "2200~3000자"}
- 마무리 CTA 포인트: ${(topic.cta_hints ?? []).join(" / ") || "—"}

[아웃라인 — 이 구조 그대로]
${outlineBlock}
${povBlock}
${styleGuideForPrompt({ withImageSlots: true })}

[출력 요구사항]
1. 위 아웃라인의 헤딩을 그대로 쓰고, 각 섹션을 **간결하게** 채워라 — 핵심만, 중복 표현·서론 반복·일반론 금지
2. Markdown 사용 (## H2, ### H3) — 불릿 리스트 + 아래 시각 요소 적극 활용
3. 도입부는 아웃라인 첫 H2 앞에 **1~2 문단** 으로 짧게 (훅 1~2 문장 + 글에서 얻는 것 1~2 문장)
4. 통계·법률·숫자 근거가 있으면 본문에 자연스럽게 녹여라 (한국 임대차보호법 등). 수치 인용 시 **출처 기관/법령명** 병기
5. 마지막 섹션은 반드시 플라트라이프 서비스 차별점(보증금 0원 / 1주 단기 / 다국어 / 거주숙소제공확인서)을 자연스럽게 브리지
6. 스타일 가이드의 **필수 준수 10가지** 와 **금지어 리스트** 를 반드시 지켜라
7. 전체 ${topic.brief ?? "2200~3000자"} 범위 유지
8. **본문에 외부 URL·링크 삽입 절대 금지** — 출처는 글 끝에 자동 첨부됨. 본문에서는 "(2026년 출입국·외국인청 기준)" 같이 기관명+시기 텍스트로만 인용
9. **타사·경쟁사 브랜드명·약관·서비스명 인용 절대 금지** (콜아웃·표·체크리스트·본문·참고 출처 어디에도)
   - ❌ 호텔/리조트 체인 (켄싱턴, 롯데호텔, 신라호텔, 메리어트, 힐튼 등)
   - ❌ 숙박 OTA·플랫폼 (야놀자, 여기어때, 에어비앤비, 부킹닷컴, 아고다 등)
   - ❌ 타사 단기임대 서비스명 / 부동산 중개업체 / 개별 호스트
   - ✅ **인용 가능 출처는 다음만** — 공식 기관·법령(출입국·외국인청, 법무부, 임대차분쟁조정위원회, 한국부동산원, 통계청 등) · 주요 뉴스 · 위키(나무위키, Wikipedia) · 커뮤니티(Reddit, Quora 등 실제 경험)
   - 비교 대상이 필요할 때는 "기숙사", "호텔", "고시원", "원룸 장기임대" 처럼 **카테고리·일반명사**로만 표현

[🔍 Google Search Grounding — 반드시 활용]
이 호출은 Google Search Grounding이 **활성화** 되어 있습니다.
다음 정보는 **반드시 Google Search로 최신 데이터를 검색해서** 본문에 인용하세요:

- ✅ 한국 주택임대차보호법·외국인 등록·비자(D-2/D-4/E/F-1) 관련 **최신 법령 및 정책 변경** (2025~2026 기준)
- ✅ ARC(외국인등록증) 발급 절차·소요 기간의 **현재 출입국·외국인청 공지**
- ✅ 단기임대·기숙사 시세·보증금 통계 등 **수치 인용 시 출처 검색**
- ✅ 한국 신학기·관광 시즌 등 **외부 이벤트 일정**

검색하지 않고 일반론만 쓰면 신뢰도가 낮아집니다.
검색 결과의 핵심 사실을 본문에 자연스럽게 녹이고, 통계·법령 인용 시
"(2026년 출입국·외국인청 기준)" 같이 출처 시기를 명시하세요.

[📊 시각 요소 활용 — 매우 중요]

본문이 텍스트 덩어리가 되지 않도록 아래 시각 요소를 **반드시 4개 이상** 자연스럽게 녹여야 한다.
독자가 스크롤할 때마다 시각 변화가 있어야 끝까지 읽는다.
※ **시각 요소가 텍스트를 대체** — 같은 내용을 본문에서 또 풀어쓰지 마. 표/콜아웃 한 번이면 그 주제는 끝.

## 필수 (각 콘텐츠에 반드시 포함)

A) **비교표** — 1개 이상 (선택지·옵션·항목 비교가 본문에 등장하면 무조건):
   | 항목 | 기숙사 | 단기임대 (플라트) |
   |---|:---:|:---:|
   | 보증금 | **500만원~** | **0원** |
   | 입주 시점 | 학기 시작에 맞춤 | 즉시 |
   | 계약 기간 | 6개월~1년 | 1주~3개월 |
   | 위치 자유도 | 캠퍼스 안 | **자유 선택** |
   | 기간 변경 | 어려움 | **유연** |
   가장 중요한 셀은 \`**값**\` 으로 강조. 정렬 헤더 \`:---:\` 활용.

B) **콜아웃 박스** — 2~3개 (각 종류를 균형있게, 남발 금지):
   > 💡 **팁**: 첫 달은 무조건 단기로 시작하세요. 동네를 익힌 뒤 1년 계약해도 늦지 않아요.
   > ⚠️ **주의**: 계약서 한국어 조항을 모르고 사인하면 보증금을 못 돌려받는 경우가 많아요.
   > ℹ️ **정보**: ARC 발급엔 보통 3~4주 걸립니다 (2026년 출입국·외국인청 기준).
   > ✅ **체크**: 계약 전 아래 3가지를 꼭 확인하세요.
   > 📌 **핵심**: 보증금이 없으면 분쟁 자체가 성립하지 않아요.

C) **체크리스트** — 1개 이상 (실행 아이템·준비물·확인사항 나열할 때):
   - [ ] 여권 + 사증 스캔본
   - [ ] 첫 달 숙소 예약 확인서
   - [ ] 보험 가입증명서
   - [ ] 한국 휴대폰 번호 (입국 후 24시간 내 권장)

D) **요약 서머리 박스** — 글 끝에 1개 (반드시):
   > ✅ **체크**: 외국인 유학생은 보증금 0원 + 1주 단위 단기임대로 시작하는 게 리스크가 가장 낮아요.

## 선택 (가능하면 추가)

E) **구분선** \`---\` — 대주제 사이 1~2회. 톤 전환 지점.

F) **수치·통계 강조** — 본문 내 굵게:
   "**평균 500만~1,000만 원**의 보증금이 묶이고, 분쟁이 생기면 **70% 이상이 외국인** 측이 불리해요. (한국임대차분쟁조정위원회 2025)"

G) **순서·단계** — \`### Step 1\` / \`### Step 2\` 형태로 절차 명확화.

## 출력 시 체크
- 비교표 1개 ✓
- 콜아웃 2~3개 ✓
- 체크리스트 1개 ✓
- 요약 박스 1개 ✓
- 합계 4개 이상의 시각 요소 ✓
- ⚠️ **분량 ${topic.brief ?? "2200~3000자"} 초과 금지** — 넘치면 표현 압축, 일반론 컷

이들이 없으면 **재작성 대상**. 자연스럽게 본문 흐름에 녹여 배치하되, 형식 자체는 위 마크다운 그대로 사용.

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
    /* 본문 작성 단계는 grounded=false — 검색은 STEP 1 에서 이미 수행 */
    grounded: false,
    modelOverride: input.quality === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash",
  })

  let body = result.text.trim()
  // 혹시 앞에 H1이 딸려 오면 제거
  body = body.replace(/^#\s+.+\n+/, "")
  // 코드블록으로 감싸져 있으면 제거
  if (body.startsWith("```")) {
    body = body.replace(/^```(?:markdown)?\n/, "").replace(/\n```\s*$/, "")
  }

  // Grounding 출처 첨부 — 매체별 그룹화 + 한국어 매체명 매핑 (클릭 불가 텍스트)
  // ※ URL 원본은 metadata.sources 에 보존 → 추후 내부 fact-check 등에 활용
  const sources = factSources
  body += formatSourceSection(sources)

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
        grounded: true,
        source_count: sources.length,
        sources: sources.slice(0, 20), // 보존 (UI에서 출처 카드 등 활용 가능)
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
    sourceCount: sources.length,
  }
}
