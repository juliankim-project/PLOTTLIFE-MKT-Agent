/**
 * Writer — Copywriter 에이전트가 브리프 기반으로 블로그 본문 1편 작성.
 *  레퍼런스 스타일 가이드 + 브리프 outline 을 프롬프트에 주입.
 *  drafts 테이블에 persist.
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"
import { runAgent } from "./agents"
import { styleGuideForPrompt, povBlockForPrompt, JOURNEY_STAGE_POV, normalizeBrandName, type JourneyStage } from "../blog-style"
import { formatSourceSection, groupSources, isAllowedSource } from "./source-format"
import { pickDabCategory } from "../dab/category"
import {
  detectBannedBrands,
  stripLinesWithBannedBrands,
  stripSentencesWithBannedBrands,
} from "../blog/banned-brands"

interface WriteInput {
  projectId: string
  topicId: string
  quality?: "flash" | "pro"
}

/**
 * LLM raw text → 정제된 본문.
 *  - 앞쪽 H1 제거
 *  - ```markdown ... ``` 코드블록 wrapping 제거
 *  - 앞뒤 공백 제거
 */
function cleanupBody(raw: string): string {
  let body = raw.trim()
  body = body.replace(/^#\s+.+\n+/, "")
  if (body.startsWith("```")) {
    body = body.replace(/^```(?:markdown)?\n/, "").replace(/\n```\s*$/, "")
  }
  return body
}

/**
 * 본문 품질 검증 — 응답이 잘렸는지 / 분량 부족인지 감지.
 * - 글자수 (no-whitespace) < 1500 → 분량 부족 (목표 2200~3000자 의 약 60% 미만)
 * - 마지막 줄이 미완성 표 row (`|` 시작했는데 닫히지 않은 형태) → 잘림
 * - 마지막 줄이 미완성 마크다운 (열린 `**`, 미닫힌 `[` 등) → 잘림
 * - 헤딩 카운트 < 2 → 구조 부실
 *
 * 반환값: 문제 있으면 reason, 정상이면 null.
 */
function detectIncomplete(body: string): string | null {
  const noWs = body.replace(/\s/g, "").length
  if (noWs < 1500) return `본문이 너무 짧음 (${noWs}자, 목표 2200+)`

  /* 마지막 비어있지 않은 라인 검사 */
  const lines = body.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const last = lines[lines.length - 1] ?? ""
  /* 표 row 인데 `|` 로 닫히지 않거나, 글자가 비정상적으로 짧으면 미완성 */
  if (/^\s*\|/.test(last) && !/\|\s*$/.test(last)) {
    return `마지막 표 row 가 미완성: "${last.slice(0, 60)}..."`
  }
  /* 닫히지 않은 bold/italic */
  const openBold = (last.match(/\*\*/g) ?? []).length
  if (openBold % 2 !== 0) return `마지막 라인 bold(**) 미닫힘`
  /* 닫히지 않은 [link */
  if (/\[[^\]]*$/.test(last)) return `마지막 라인 [링크] 미닫힘`

  /* H2 가 2개 미만 → 구조 부실 */
  const h2Count = (body.match(/^##\s+/gm) ?? []).length
  if (h2Count < 2) return `H2 섹션이 ${h2Count}개 — 최소 3개 필요`

  return null
}

/**
 * 본문 끝의 "참고 출처/자료/문헌·References" 섹션 제거.
 * LLM 이 grounded 모드에서 종종 자기 출처 박는데, 우리는 formatSourceSection()
 * 으로 별도 footer 를 붙이므로 중복 차단.
 */
function stripTrailingSourcesSection(md: string): string {
  let s = md

  /* 0) HTML <br>, <p></p>, <div></div> 등 제거 — markdown 본문에 섞이면 텍스트로 노출됨 */
  s = s.replace(/<br\s*\/?>/gi, "")
  s = s.replace(/<\/?(p|div|span)[^>]*>/gi, "")

  /* 0-1) 마크다운 링크 [label](http(s)://...) → label 만 남김 — 어디 환경에서도 클릭 X.
     ※ (?<!!) 로 이미지 마크다운 ![alt](url) 은 보존 */
  s = s.replace(/(?<!!)\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, "$1")
  /* 0-2) 본문에 raw URL 만 있는 줄/구간 제거 (https://... 단독, 이미지 src 는 보존됨) */
  s = s.replace(/(?<![">'\w(])https?:\/\/(?![^\s)]+\))\S+/g, "")

  /* 1) 명시적 헤딩 (## / ### / **) — 그 다음 모든 라인 절단 */
  s = s.replace(
    /\n+(?:[#]{1,6}\s*|\*\*\s*)(?:📚\s*)?(?:참고\s*(?:출처|자료|문헌)|References?)\s*[:.]*\s*\*{0,2}\s*\n[\s\S]*$/i,
    ""
  )
  /* 2) 평문 라벨 ("참고 출처:" / "출처:" / "References:") 다음 라인들 */
  s = s.replace(
    /\n+(?:참고\s*(?:출처|자료|문헌)|출처|References?)\s*[:.]+\s*\n[\s\S]*$/i,
    ""
  )
  /* 3) 마지막 줄들에 grounding redirect URL 만 있는 경우도 정리
     (vertexaisearch.cloud.google.com / googleusercontent / google.com/url) */
  s = s.replace(
    /\n+(?:[-•*]\s*)?\[?(?:vertexaisearch\.cloud\.google\.com|googleusercontent\.com|google\.com\/url)[^\n]*$/gim,
    ""
  )

  /* 4) 끝부분의 빈 줄 / 잔존 공백 / 잔존 <br> 제거 */
  s = s.replace(/(\n\s*){3,}/g, "\n\n")  // 3줄+ 빈줄 → 2줄
  s = s.replace(/\s+$/, "")               // trailing whitespace
  return s
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
- 타사 단기임대·렌탈 서비스: **엔코스테이, 미스터멘션, 위홈, 스테이폴리오, 더스테이, 코지스테이, 넘버25, 블루그라운드, 어반스테이** 등 — 이름 자체를 사실 출처로 쓰지 말 것
- 숙박 OTA: 야놀자·여기어때·에어비앤비·부킹닷컴·아고다·익스피디아·트립닷컴·호텔스닷컴
- 호텔·리조트 체인: 켄싱턴·롯데호텔·신라호텔·신라스테이·메리어트·힐튼·하얏트·포시즌·인터컨티넨탈·쉐라톤·노보텔·조선호텔·L7·글래드
- 부동산 중개업체 광고·블로그
- 일반 기업 사이트의 약관·이용약관·개인정보처리방침 페이지

⚠️ "엔코스테이 호스트", "미스터멘션 자료" 같은 인용 절대 금지 — 이런 출처는 위 화이트리스트가 아니므로 사실 자체를 사용하지 말고 다른 출처로 대체.

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
    /* 경쟁사 브랜드 포함된 라인은 통째로 제거 — grounded fact 가 경쟁사 블로그를
       끌어와 "엔코스테이 호스트 2025" 식 인용을 만드는 경로 차단 */
    const cleanedFacts = stripLinesWithBannedBrands(factsText)
    if (cleanedFacts.length !== factsText.length) {
      const removed = detectBannedBrands(factsText)
      console.warn(
        `[writer] facts sanitized — banned brands removed: ${removed.join(", ")}`
      )
    }
    factsText = cleanedFacts
    /* 출처 화이트리스트 적용 — 정부·공공·뉴스·위키·커뮤니티만 통과 (경쟁사 도메인은 hard block) */
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

  const today = new Date().toISOString().slice(0, 10)
  const todayYear = today.slice(0, 4)

  const prompt = `${factsText && factSources.length > 0
    ? `[STEP 0: 위 단계에서 Google Search 로 수집된 최신 사실 — 본문에 자연스럽게 인용]\n${factsText}\n\n[참조한 출처 — 본문 끝 "참고 출처" 섹션에 자동 첨부됩니다]\n${promptSourceList}\n\n위 사실들을 활용해 아래 본문을 작성하세요.\n\n────────────────────────\n\n`
    : ""}플라트 라이프 (한국 단기임대 플랫폼) 블로그 본문을 작성해줘.

브랜드명은 항상 "플라트 라이프" 풀네임으로 (공백 포함). "플라트라이프" 붙여쓰기·"플라트" 단독 줄임 금지.

오늘 날짜: ${today}

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

[📝 가독성 — 줄·단락 호흡 (매우 중요)]
- **한 문장은 70~80자 안쪽** — 넘치면 두 문장으로 나눠라
- **한 단락은 1~3 문장** — 4 문장 넘기지 말 것
- **단락 사이엔 반드시 빈 줄 한 줄** — 마크다운에서 단락 분리. 한 덩어리로 붙이지 마
- 같은 주제라도 호흡 끊는 지점에서 단락을 새로 시작
- 호흡 예시 (좋음):
  > 외국인 유학생이 한국에서 첫 숙소를 잡을 때 가장 큰 걱정은 보증금이에요.
  >
  > 평균 **500만~1,000만 원** 이 묶이고, 분쟁이 생기면 70% 이상이 외국인 측이 불리해요.
  >
  > 그래서 첫 달은 보증금 0원짜리 단기임대로 시작하는 게 가장 안전해요.
- 나쁜 예 (긴 한 단락에 다 몰아넣기): "외국인 유학생이 한국에서 첫 숙소를 잡을 때 가장 큰 걱정은 보증금이에요. 평균 500~1,000만 원이 묶이고 분쟁이 생기면 70% 이상이 외국인 측이 불리해요. 그래서 첫 달은 보증금 0원 단기임대로 시작하는 게 안전합니다…" ❌
4. 통계·법률·숫자 근거가 있으면 본문에 자연스럽게 녹여라 (한국 임대차보호법 등). 수치 인용 시 **출처 기관/법령명** 병기
5. 마지막 섹션은 반드시 플라트 라이프 서비스 차별점(보증금 0원 / 1주 단기 / 다국어 / 거주숙소제공확인서)을 자연스럽게 브리지
6. 스타일 가이드의 **필수 준수 10가지** 와 **금지어 리스트** 를 반드시 지켜라
7. 전체 ${topic.brief ?? "2200~3000자"} 범위 유지
8. **본문에 외부 URL·링크 삽입 절대 금지** — 출처는 글 끝에 자동 첨부됨. 본문에서는 "(2026년 출입국·외국인청 기준)" 같이 기관명+시기 텍스트로만 인용
8-1. **참고 출처/자료/References 섹션 절대 만들지 마** — 본문 끝에 시스템이 자동으로 "📚 참고 출처" 섹션을 첨부하므로, LLM 이 같은 섹션을 만들면 중복됨. "## 참고 출처", "참고 자료:", "References:" 등 어떤 형식으로도 출처 목록 섹션을 작성하지 말 것.
8-2. **HTML 태그 절대 사용 금지** — \`<br>\`, \`<p>\`, \`<div>\`, \`<span>\` 등 어떤 HTML 태그도 본문에 박지 마. 줄바꿈은 마크다운 빈 줄(\\n\\n)로, 강조는 \`**bold**\`, 단락 분리는 빈 줄. 다른 곳 글에서 HTML 본 적 있더라도, 여기는 **순수 마크다운만**.
9. **타사·경쟁사 브랜드명·약관·서비스명 인용 절대 금지** (콜아웃·표·체크리스트·본문·참고 출처 어디에도)
   - ❌ **타사 단기임대 서비스 (이름 자체 금지)**: 엔코스테이, 미스터멘션, 위홈, 스테이폴리오, 더스테이, 코지스테이, 넘버25, 블루그라운드, 어반스테이 등
   - ❌ 숙박 OTA·플랫폼: 야놀자, 여기어때, 에어비앤비(Airbnb), 부킹닷컴(Booking), 아고다, 익스피디아, 트립닷컴, 호텔스닷컴
   - ❌ 호텔/리조트 체인: 켄싱턴, 롯데호텔, 신라호텔, 신라스테이, 메리어트, 힐튼, 하얏트, 포시즌, 인터컨티넨탈, 쉐라톤, 노보텔, 조선호텔, L7, 글래드
   - ❌ 부동산 중개업체 / 개별 호스트 / 호스트 블로그
   - ⚠️ **"엔코스테이 호스트", "미스터멘션 자료에 따르면" 식 인용 패턴 절대 금지** — 이런 출처 자체를 사실 근거로 쓰지 말 것
   - ✅ **인용 가능 출처는 다음만** — 공식 기관·법령(출입국·외국인청, 법무부, 임대차분쟁조정위원회, 한국부동산원, 통계청 등) · 주요 뉴스 · 위키(나무위키, Wikipedia) · 커뮤니티(Reddit, Quora 등 실제 경험)
   - 비교 대상이 필요할 때는 "기숙사", "호텔", "고시원", "원룸 장기임대" 처럼 **카테고리·일반명사**로만 표현

[🛡 검수 통과 체크리스트 — 작성하면서 동시에 점검]

▸ SEO 자체 점검
- 제목·도입부·결론에 **primary 키워드 (${topic.primary_keyword})** 자연스럽게 포함
- secondary 키워드 (${(topic.secondary_keywords ?? []).join(", ")}) 본문 곳곳에 분산 — 한 곳에 몰리지 마
- 비교·추천 항목이 3개 이상이면 **H3 로 분리**해 구조화 (예: "### 연세대 주변 / ### 경희대 주변 / ### 홍대·서강대 주변")
- 롱테일 키워드 활용 — 대학 이름·동네 이름 + "단기임대"·"외국인 숙소" 조합
- 이미지 alt 는 **장면을 구체적으로 묘사**한 한국어 (15~30자)

▸ 팩트·출처 자체 점검
- ⚠️ **미래 시점 통계 인용 절대 금지** — 오늘이 ${today} 이므로 ${todayYear} 보다 미래 연도 통계 인용 X
- 수치·통계는 "기관명 + 보고서/제도명 + 연도" 명시 (예: "교육부 외국인 유학생 통계 2024")
- 단순 "${todayYear}년 출입국·외국인청 기준" 같이 두루뭉술 표현 X — **공식 명칭** 사용 (예: "출입국관리법", "외국인등록 업무 처리 지침")
- 검증이 불확실한 수치는 **범위·일반화** 로: "일반적으로 2~4주 소요" / "보통 평균 X~Y 사이"
- ${todayYear} 시점에서 너무 오래된 통계 (예: 2020 이전) 가급적 피하고, 최신 자료 우선

▸ 톤·브랜드 자체 점검
- 플라트 라이프 보이스: ~예요 / ~돼요 / ~해요 — **부드러운 존댓말**
- 금지어: ~거든요 / ~답니다 / ~합니다 (딱딱한 종결)
- 외국인 유학생도 이해 가능한 난이도 — 한국 행정 용어는 풀어 설명

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

⚠️ **이미지 description 작성 규칙** — 이미지 모델이 한국어 표지판/역명을 잘못 그리는 문제가 있어 다음 장면은 description 에 절대 쓰지 말 것:
- ❌ 지하철역·지하철 입구·플랫폼·역 표지판
- ❌ 역명·동네명·랜드마크명 (예: "홍대입구역", "강남", "이태원")
- ❌ 거리 표지판·간판이 보이는 거리
- ❌ 학교 정문·간판이 보이는 캠퍼스

✅ 대신 다음 같은 장면 위주로:
- 실내 (원룸 거실, 카페 인테리어, 도서관, 코워킹 스페이스)
- 인물 클로즈업 (대화·일상 표정·손동작)
- 자연 풍경 (가을 단풍 거리, 한강 산책, 동네 골목)
- 추상적 컨셉 샷 (책상 위 노트북·여권·열쇠)

예) <!-- IMAGE_SLOT_1: 서울 원룸의 밝은 거실에서 노트북으로 한국어 공부 중인 외국인 유학생의 일상 장면 -->
예) <!-- IMAGE_SLOT_2: 따뜻한 조명의 카페에서 친구와 대화하는 두 청년의 자연스러운 순간 -->

[응답 형식]
**Markdown 본문만** 출력. 다른 설명·주석·코드블록(\`\`\`markdown) 금지.
제목(H1)은 포함하지 말고 도입부부터 시작.`

  /* 본문 작성 — 응답이 잘리거나 분량 부족하면 1회 재시도 */
  let result = await runAgent({
    agentSlug: "copywriter",
    stage: "write",
    projectId: input.projectId,
    prompt,
    temperature: 0.5,
    maxTokens: 16000,
    json: false,
    /* 본문 작성 단계는 grounded=false — 검색은 STEP 1 에서 이미 수행 */
    grounded: false,
    modelOverride: input.quality === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash",
  })

  let body = cleanupBody(result.text)
  let incomplete = detectIncomplete(body)
  if (incomplete) {
    console.warn(`[writer] retry — ${incomplete}`)
    result = await runAgent({
      agentSlug: "copywriter",
      stage: "write",
      projectId: input.projectId,
      prompt: `${prompt}\n\n[⚠️ 재시도 — 직전 응답이 ${incomplete} 였습니다. 이번엔 반드시 끝까지 완성된 본문 (목표 분량 ${topic.brief ?? "2200~3000자"}, H2 4개 이상, 표/콜아웃/체크리스트 모두 닫힌 상태) 를 출력하세요.]`,
      temperature: 0.55,
      maxTokens: 16000,
      json: false,
      grounded: false,
      modelOverride: input.quality === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash",
    })
    body = cleanupBody(result.text)
    incomplete = detectIncomplete(body)
    if (incomplete) {
      console.warn(`[writer] still incomplete after retry — ${incomplete} (continuing anyway)`)
    }
  }

  /* ─── 경쟁사 브랜드 검출 → 재작성 1회 → 그래도 남으면 문장 단위 scrub ─── */
  let bannedHits = detectBannedBrands(body)
  if (bannedHits.length > 0) {
    console.warn(`[writer] banned brands detected: ${bannedHits.join(", ")} — rewriting`)
    const banListStr = bannedHits.map((b) => `"${b}"`).join(", ")
    const rewriteResult = await runAgent({
      agentSlug: "copywriter",
      stage: "write",
      projectId: input.projectId,
      prompt: `${prompt}\n\n[⚠️ 재작성 필수 — 직전 응답에 금지된 타사 브랜드명 (${banListStr}) 이 포함됐습니다. 이 브랜드들을 본문 어디에도 박지 말고, 사실 인용이 필요하면 "공식 기관 + 연도" 형태나 "한국 단기임대 시장 평균" 같은 일반화로 대체하세요. 같은 주제·구조로 다시 작성.]`,
      temperature: 0.45,
      maxTokens: 16000,
      json: false,
      grounded: false,
      modelOverride: input.quality === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash",
    })
    body = cleanupBody(rewriteResult.text)
    bannedHits = detectBannedBrands(body)
    if (bannedHits.length > 0) {
      /* 재작성 후에도 남으면 — 해당 문장만 scrub + 경고 로그 */
      console.warn(
        `[writer] banned brands still present after rewrite: ${bannedHits.join(", ")} — stripping sentences`
      )
      body = stripSentencesWithBannedBrands(body)
    }
  }

  /* ─── 후처리: LLM 이 본문에 박은 "참고 출처/References" 섹션 제거 ───
     우리는 별도 footer 를 formatSourceSection() 으로 추가하므로,
     LLM 이 만든 출처 섹션이 있으면 중복됨. 본문 끝에서 잘라낸다.
     - "## 참고 출처", "## 참고 자료", "## References" 등 헤딩 + 그 아래 전부
     - "참고 출처:" / "출처:" / "References:" 같은 평문 라벨 + 라인들
     - vertexaisearch.cloud.google.com 같은 grounding redirect URL 라인 */
  body = stripTrailingSourcesSection(body)

  /* 브랜드 표기 정규화 — "플라트라이프"(붙여) / "플라트"(단독) → "플라트 라이프" */
  body = normalizeBrandName(body)

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
        /* 콘텐츠 관리 페이지 카테고리 칼럼용 — 자동 매핑 결과 보존 */
        dab_category: pickDabCategory({
          title: topic.title,
          primaryKeyword: topic.primary_keyword,
          secondaryKeywords: topic.secondary_keywords,
          journeyStage: topic.journey_stage,
        }),
        /* 어드민 발행 상태 — 검수 후 콘텐츠 관리에 들어왔을 때 디폴트 OFF */
        dab_status: null,
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

/* ════════════════════════════════════════════════════════════════
   재작성 — 검수 피드백을 반영해 기존 본문 다시 쓰기
   ════════════════════════════════════════════════════════════════ */

interface RewriteInput {
  projectId: string
  draftId: string
  /** 사용자 추가 메모 (옵션) — 검수 외 추가 요청 사항 */
  extraNote?: string
  quality?: "flash" | "pro"
}

/**
 * 검수 결과의 모든 suggestions/notes 를 모아 Writer 에게 던져 본문 재작성.
 * - drafts.body_markdown 덮어쓰기
 * - metadata.rewrite_count 증가, rewritten_at 갱신
 * - fact-finding STEP 1 은 스킵 (기존 metadata.sources 재사용)
 */
export async function rewriteDraftWithReview(input: RewriteInput) {
  const db = supabaseAdmin()

  /* draft + topic 로드 */
  const { data: draft, error: draftErr } = await db
    .from("drafts")
    .select("*")
    .eq("id", input.draftId)
    .single()
  if (draftErr || !draft) throw new Error(`draft not found: ${draftErr?.message}`)

  let topic: Record<string, unknown> | null = null
  if (draft.topic_id) {
    const { data } = await db.from("topics").select("*").eq("id", draft.topic_id).maybeSingle()
    topic = data as Record<string, unknown> | null
  }
  if (!topic) throw new Error("topic 정보 없음 — 재작성 불가")

  /* 페르소나 */
  let personaLabel = "외국인 게스트"
  if (topic.persona_id) {
    const { data: p } = await db
      .from("personas")
      .select("label")
      .eq("id", topic.persona_id as string)
      .maybeSingle()
    if (p) personaLabel = p.label
  }

  /* 최신 review 로드 */
  const { data: review } = await db
    .from("reviews")
    .select("items, overall_score")
    .eq("draft_id", input.draftId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  /* review suggestions/note 를 한 줄씩 정리 */
  const feedbackLines: string[] = []
  if (review?.items) {
    const items = review.items as Record<string, unknown>
    /* 카테고리별 ok=false 항목의 suggestion */
    const categories = Array.isArray(items.categories) ? (items.categories as Array<{ cat: string; items?: Array<{ ok: boolean; label: string; suggestion?: string; detail?: string }> }>) : []
    for (const c of categories) {
      for (const it of c.items ?? []) {
        if (!it.ok && it.suggestion) {
          feedbackLines.push(`[${c.cat}] ${it.label} → ${it.suggestion}`)
        }
      }
    }
    /* source_check */
    const src = items.source_check as { missing_citations?: string[]; date_inconsistencies?: string[]; suspicious_urls?: string[] } | undefined
    if (src) {
      for (const m of src.missing_citations ?? []) feedbackLines.push(`[출처] 출처 없는 주장: "${m}" — 기관·연도 명시 필요`)
      for (const d of src.date_inconsistencies ?? []) feedbackLines.push(`[시기] ${d}`)
      for (const u of src.suspicious_urls ?? []) feedbackLines.push(`[URL] 의심 URL: ${u} — 제거`)
    }
    /* fact-check 의 PARTIAL/CONTRADICTED */
    const fcs = Array.isArray(items.fact_checks) ? (items.fact_checks as Array<{ claim: string; status: string; note?: string }>) : []
    for (const fc of fcs) {
      if (fc.status === "PARTIAL" || fc.status === "CONTRADICTED") {
        feedbackLines.push(`[팩트 ${fc.status}] "${fc.claim}" — ${fc.note ?? "재검토 필요"}`)
      }
      if (fc.status === "UNVERIFIABLE") {
        feedbackLines.push(`[팩트 검증불가] "${fc.claim}" — 출처 없는 단정 회피, 일반화·범위로 표현`)
      }
    }
  }

  if (input.extraNote) feedbackLines.push(`[추가 요청] ${input.extraNote}`)

  if (feedbackLines.length === 0 && !input.extraNote) {
    throw new Error("반영할 검수 피드백이 없어요. 먼저 검수를 실행해주세요.")
  }

  const today = new Date().toISOString().slice(0, 10)

  /* 재작성 prompt — 기존 본문 + 피드백 + 동일한 가이드라인 */
  const prompt = `플라트 라이프 블로그 본문을 **검수 피드백을 반영해 다시 작성** 해주세요.

브랜드명은 항상 "플라트 라이프" 풀네임으로. "플라트라이프"(붙여)·"플라트"(단독) 금지.

오늘 날짜: ${today}

[원본 본문]
${draft.body_markdown ?? ""}

[🛠 반영해야 할 검수 피드백 (반드시 모두 반영)]
${feedbackLines.map((l, i) => `${i + 1}. ${l}`).join("\n")}

[기존 정보]
- 제목: ${draft.title}
- Primary 키워드: ${draft.primary_keyword ?? topic.primary_keyword ?? ""}
- Secondary 키워드: ${(draft.secondary_keywords ?? topic.secondary_keywords ?? []).join(", ")}
- 타겟 페르소나: ${personaLabel}
- 목표 길이: ${topic.brief ?? "2200~3000자"}

[재작성 원칙]
1. **모든 검수 피드백을 빠짐없이 반영** — 위 항목들 하나씩 점검
2. 본문 톤·구조는 유지하되, 지적된 부분은 바꿔야 함
3. ⚠️ **미래 시점 통계 인용 절대 금지** — 오늘이 ${today} 이므로 ${today.slice(0, 4)} 보다 미래 연도 통계 X
4. 수치·통계는 **기관명 + 보고서명 + 연도** 명시
5. 검증 불확실한 주장은 "일반적으로 X~Y" 같이 범위·일반화로
6. 단락 1~3 문장, 단락 사이 빈 줄 한 줄 (가독성)
7. 본문 끝에 "참고 출처" 섹션 만들지 말 것 — 시스템이 자동 첨부
8. 외부 URL·링크 본문 삽입 금지
9. 타사·경쟁사 브랜드명 직접 언급 금지
10. **HTML 태그 절대 사용 금지** (\`<br>\`, \`<p>\`, \`<div>\` 등) — 순수 마크다운만

${styleGuideForPrompt({ withImageSlots: false })}

[응답 형식]
**Markdown 본문만** 출력. 다른 설명·주석·코드블록 금지. H1 포함 X. 도입부부터.`

  const result = await runAgent({
    agentSlug: "copywriter",
    stage: "write",
    projectId: input.projectId,
    prompt,
    temperature: 0.45,
    maxTokens: 16000,
    json: false,
    grounded: false,
    modelOverride: input.quality === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash",
  })

  let body = cleanupBody(result.text)
  /* 검수 재작성도 분량/잘림 검증 — 문제 시 1회 재시도 */
  const rewriteIncomplete = detectIncomplete(body)
  if (rewriteIncomplete) {
    console.warn(`[writer:rewrite] retry — ${rewriteIncomplete}`)
    const retryResult = await runAgent({
      agentSlug: "copywriter",
      stage: "write",
      projectId: input.projectId,
      prompt: `${prompt}\n\n[⚠️ 재시도 — 직전 응답이 ${rewriteIncomplete}. 이번엔 끝까지 완성된 본문을 출력하세요.]`,
      temperature: 0.5,
      maxTokens: 16000,
      json: false,
      grounded: false,
      modelOverride: input.quality === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash",
    })
    body = cleanupBody(retryResult.text)
  }
  /* 경쟁사 브랜드 잔존 시 문장 scrub (재작성 단계에선 retry 생략 — feedback 반영이 핵심) */
  const rewriteBanHits = detectBannedBrands(body)
  if (rewriteBanHits.length > 0) {
    console.warn(`[writer:rewrite] banned brands detected: ${rewriteBanHits.join(", ")} — stripping`)
    body = stripSentencesWithBannedBrands(body)
  }
  body = stripTrailingSourcesSection(body)
  body = normalizeBrandName(body)

  /* 기존 sources 재사용 (fact-finding 스킵) */
  const existingSources = (draft.metadata as { sources?: Array<{ uri: string; title?: string; domain?: string }> } | null)?.sources ?? []
  body += formatSourceSection(existingSources)

  /* drafts 업데이트 — body 덮어쓰기 + metadata 갱신 */
  const baseMeta = (draft.metadata as Record<string, unknown> | null) ?? {}
  const rewriteCount = ((baseMeta.rewrite_count as number) ?? 0) + 1
  const nextMeta = {
    ...baseMeta,
    rewrite_count: rewriteCount,
    rewritten_at: new Date().toISOString(),
    last_rewrite_feedback_count: feedbackLines.length,
  }

  const { data: updated, error: updErr } = await db
    .from("drafts")
    .update({
      body_markdown: body,
      metadata: nextMeta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.draftId)
    .select()
    .single()
  if (updErr || !updated) throw new Error(`drafts update: ${updErr?.message}`)

  return {
    draft: updated,
    feedbackCount: feedbackLines.length,
    rewriteCount,
    provider: result.provider,
    model: result.model,
    durationMs: result.durationMs,
    charCount: body.length,
  }
}
