import type { TargetKPI, OutlineSection, ContentType, BlogContent } from "./schema"
import { KPI_PROMPT_STRATEGIES } from "./kpi-strategies"

/**
 * Mock LLM — Phase 1
 * 플라트라이프 브랜드 보이스와 실제 매물 맥락을 반영한 다양한 아웃라인/본문 생성.
 * Phase 2에서 Claude API로 교체 시 이 파일만 수정.
 */

export interface IdeaInput {
  primary_keyword: string
  target_kpi: TargetKPI
  target_audience?: string
  content_type?: ContentType
  count?: number
}

export interface IdeaOutput {
  title: string
  angle: string
  estimated_search_volume?: string
  difficulty?: "low" | "medium" | "high"
  rationale: string
}

// ── 아이데이션 ──────────────────────────────────────────

const TITLE_PATTERNS: Record<TargetKPI, string[]> = {
  conversion: [
    "{keyword} 추천 TOP 10 — 즉시 입주 가능",
    "{keyword} 베스트 방 7선 — 보증금 없는 옵션까지",
    "{keyword} 숙소 비교 가이드 — 가격·위치·기간",
    "유학생이 선택한 {keyword} 인기 매물",
    "{keyword} 풀옵션 단기임대 완벽 추천",
    "{keyword} 가성비 원룸 8곳 — 월 50만원대부터",
    "즉시 계약 가능한 {keyword} 오피스텔 6선",
    "{keyword} 지하철역 3분 거리 방 모음",
  ],
  traffic: [
    "{keyword} 완벽 가이드 — 2026년 최신 정보",
    "{keyword} 알아야 할 모든 것",
    "{keyword} 방법 5가지와 주의할 점",
    "{keyword} 계약 전 체크리스트 10가지",
    "외국인을 위한 {keyword} 가이드",
    "{keyword} 비용 총정리 — 월세·관리비·공과금",
    "처음 {keyword} 하는 사람을 위한 A to Z",
    "{keyword} FAQ 20선 — 계약부터 퇴실까지",
  ],
  dwell_time: [
    "{keyword}에서 한 달, 실제로 살아보니",
    "처음 {keyword}, 그때 알았더라면 좋았을 것들",
    "유학생의 {keyword} 정착 일기 — 30일간의 기록",
    "솔직하게 말하는 {keyword} 라이프",
    "호스트와 게스트, {keyword}에서 만나다",
    "{keyword} 첫 자취, 그 설렘과 두려움 사이",
    "디지털노마드의 {keyword} 워케이션 후기",
    "{keyword}에서 배운 것들 — 사진과 함께",
  ],
}

const ANGLES: Record<TargetKPI, string[]> = {
  conversion: [
    "구체적 매물 추천 중심",
    "가격·기간 비교 테이블",
    "대학·직장 근접도 기준",
    "보증금·환불 FAQ 강화",
    "긴급·한정 매물 소구",
    "입주 프로세스 간소화",
    "가성비 순위",
    "교통 편의성 기준",
  ],
  traffic: [
    "롱테일 키워드 포괄",
    "초보자 대상 Q&A 형식",
    "숫자 리스트 (스니펫 유리)",
    "경쟁사 비교",
    "2026년 트렌드 반영",
    "단계별 가이드",
    "비용 분석 심층",
    "용어 해설",
  ],
  dwell_time: [
    "1인칭 경험담",
    "시간순 스토리 (Day 1→30)",
    "인터뷰·대화 중심",
    "사진·영상 중심",
    "감정·고민 드러내기",
    "여정 기록",
    "깊이 있는 관찰",
    "호스트-게스트 관계",
  ],
}

const SAMPLE_AUDIENCES = ["유학생", "디지털노마드", "내국인 전근/파견", "외국인 주재원", "이사 과도기 거주자"]

export function generateIdeas(input: IdeaInput): IdeaOutput[] {
  const count = input.count ?? 10
  const patterns = TITLE_PATTERNS[input.target_kpi]
  const angles = ANGLES[input.target_kpi]
  const ideas: IdeaOutput[] = []

  for (let i = 0; i < count; i++) {
    const pattern = patterns[i % patterns.length]
    const angle = angles[i % angles.length]
    const audience = input.target_audience ?? SAMPLE_AUDIENCES[i % SAMPLE_AUDIENCES.length]
    const title =
      pattern.replace("{keyword}", input.primary_keyword) +
      (i >= patterns.length ? ` — ${audience}` : "")

    ideas.push({
      title,
      angle,
      estimated_search_volume: ["낮음", "중간", "높음"][i % 3],
      difficulty: (["low", "medium", "high"] as const)[i % 3],
      rationale: `${
        input.target_kpi === "conversion"
          ? "예약 전환"
          : input.target_kpi === "traffic"
          ? "오가닉 트래픽"
          : "체류시간"
      } 관점: ${angle}`,
    })
  }
  return ideas
}

// ── 아웃라인 생성 ──────────────────────────────────────────

/**
 * KPI × 콘텐츠 타입에 따라 다양한 아웃라인 템플릿을 무작위 선택.
 * 같은 KPI여도 콘텐츠 타입에 따라 구조가 달라짐.
 */
export function generateOutline(
  title: string,
  target_kpi: TargetKPI,
  primary_keyword: string,
  content_type?: ContentType,
  seed?: number,
): OutlineSection[] {
  const pool = OUTLINE_POOL[target_kpi]
  const s = seed ?? Math.floor(Math.random() * pool.length)
  const template = pool[s % pool.length]
  return template({ title, primary_keyword })
}

type OutlineTemplate = (ctx: { title: string; primary_keyword: string }) => OutlineSection[]

const OUTLINE_POOL: Record<TargetKPI, OutlineTemplate[]> = {
  conversion: [
    // 지역 가이드 — 추천 리스트 중심
    ({ primary_keyword }) => [
      {
        heading: `${primary_keyword}, 빠른 요약`,
        bullets: ["이 글에서 소개할 매물 개수 (8~10개)", "예산 범위 (월 40~120만원)", "공통 조건 (풀옵션·즉시 입주 가능)"],
      },
      {
        heading: "추천 매물 TOP 10",
        bullets: [
          "#1 — 풀옵션 원룸 (역세권 3분)",
          "#2 — 투룸 오피스텔 (주방 분리형)",
          "#3 — 보증금 없는 원룸",
          "#4 — 대학 정문 도보 5분",
          "#5~#10 (매물 카드 임베드)",
        ],
      },
      {
        heading: "가격·기간 비교 매트릭스",
        bullets: ["1주 / 2주 / 1개월 / 3개월 가격표", "보증금 유무별 옵션", "관리비·청소비 포함 여부"],
      },
      {
        heading: "예약 프로세스 — 3단계",
        bullets: ["① 방 선택·문의 (1분)", "② 계약서 확인·결제 (5분)", "③ 입주 당일 키박스 수령"],
      },
      {
        heading: "자주 묻는 질문",
        bullets: [
          "보증금은 언제 돌려받나요?",
          "입주 전 방을 직접 볼 수 있나요?",
          "외국인도 계약 가능한가요? (ARC 서류)",
          "환불·취소 정책이 궁금합니다",
        ],
      },
      {
        heading: "지금 바로 문의하기",
        bullets: ["카카오톡 문의", "24시간 고객지원", "영어·중국어·베트남어 상담 가능"],
      },
    ],

    // 대학 근처 — 학생 타겟
    ({ primary_keyword }) => [
      {
        heading: `왜 ${primary_keyword}인가요?`,
        bullets: ["통학 시간 절약 (도보 10분 이내)", "학생 친화 상권", "안전한 주거 환경"],
      },
      {
        heading: "예산별 추천 매물",
        bullets: ["💰 40~60만원대 (원룸)", "💰 60~90만원대 (투룸·오피스텔)", "💰 90만원+ (프리미엄 레지던스)"],
      },
      {
        heading: "외국인 유학생에게 특히 좋은 이유",
        bullets: ["다국어 상담", "거주숙소제공확인서 발급 지원", "학기 단위 계약 가능"],
      },
      {
        heading: "체크리스트 — 계약 전 꼭 확인할 것",
        bullets: ["인터넷·TV 옵션", "관리비 포함 항목", "공용 공간 (세탁실 등)", "소음 수준"],
      },
      {
        heading: "지금 문의하면 좋은 이유",
        bullets: ["신학기 방은 2개월 전에 마감", "얼리버드 할인 이벤트", "학생증 확인 시 수수료 면제"],
      },
    ],

    // 출장·단기 타겟
    ({ primary_keyword }) => [
      {
        heading: `${primary_keyword} — 출장자가 원하는 조건`,
        bullets: ["책상·Wi-Fi 필수", "즉시 입주", "영수증·세금계산서 발행"],
      },
      {
        heading: "추천 매물 — 업무 최적화",
        bullets: ["① 모니터 포함 오피스텔", "② 전망 좋은 고층", "③ 조용한 스튜디오", "④~⑥ 추가 옵션"],
      },
      {
        heading: "법인 결제 안내",
        bullets: ["세금계산서 발행 가능 매물", "결제 방법 (카드·계좌이체·VBank)", "출장비 증빙 절차"],
      },
      {
        heading: "체크인 프로세스",
        bullets: ["키박스 코드 전달", "24/7 입주 가능", "공항에서 바로 이동"],
      },
      {
        heading: "다른 출장자들의 후기",
        bullets: ["한 달 체류 후기", "재방문율 통계", "기업 단체 이용 사례"],
      },
    ],
  ],

  traffic: [
    // 롱폼 가이드 — 검색 최적화
    ({ primary_keyword }) => [
      {
        heading: `${primary_keyword}이란 무엇인가요?`,
        bullets: ["정의", "전통적인 월세·전세와의 차이", "왜 최근 수요가 늘어나는가"],
      },
      {
        heading: `${primary_keyword}의 3가지 유형`,
        bullets: ["1. 주거형 (풀옵션 원룸·오피스텔)", "2. 생활형 레지던스 (서비스 포함)", "3. 공유숙소 (쉐어하우스·고시원)"],
      },
      {
        heading: `${primary_keyword} 비용 — 완전 분석`,
        bullets: ["월세·주세 범위", "관리비 구조", "공과금·인터넷·TV", "보증금 옵션", "중개·플랫폼 수수료"],
      },
      {
        heading: "이용 방법 — 5단계",
        bullets: ["1단계: 조건 정리 (지역·기간·예산)", "2단계: 플랫폼 검색", "3단계: 매물 비교", "4단계: 계약·결제", "5단계: 입주 후 관리"],
      },
      {
        heading: "주의할 점 체크리스트",
        bullets: ["계약 전 확인 사항 7가지", "외국인 특수 사항 (ARC·비자)", "흔한 실수와 사기 사례"],
      },
      {
        heading: "자주 묻는 질문 (FAQ)",
        bullets: ["Q1. 최소·최대 계약 기간?", "Q2. 보증금 얼마인가?", "Q3. 중간 퇴실 가능한가?", "Q4. 계약 갱신은?", "Q5. 호스트와 분쟁 시?"],
      },
      {
        heading: "관련 가이드 더보기",
        bullets: ["내부링크: 지역별 가이드", "내부링크: 학교별 추천", "내부링크: 보증금 없는 방"],
      },
    ],

    // 비교·대안 콘텐츠
    ({ primary_keyword }) => [
      {
        heading: `${primary_keyword}, 왜 비교가 중요한가`,
        bullets: ["각 방식의 대표 특징", "비용 차이 범위", "누구에게 적합한지"],
      },
      {
        heading: "한눈에 보는 비교표",
        bullets: [
          "기간 (1주 vs 1개월 vs 12개월)",
          "비용 (일일 요금 환산)",
          "보증금",
          "가구·가전",
          "청소·관리",
          "계약 복잡도",
        ],
      },
      {
        heading: "상황별 추천",
        bullets: ["🧑‍🎓 유학생이라면", "💼 출장자라면", "🏠 이사 중이라면", "✈️ 한달살기라면"],
      },
      {
        heading: "숨은 비용 주의",
        bullets: ["청소비·관리비", "전기·가스·수도", "Wi-Fi·TV 옵션", "퇴실 시 공제"],
      },
      {
        heading: "실제 사례로 보는 선택 가이드",
        bullets: ["사례 1: 1개월 서울 출장자", "사례 2: 한 학기 유학생", "사례 3: 3개월 리모델링 중"],
      },
      {
        heading: "결론 — 나에게 맞는 선택",
        bullets: ["체크리스트 5개 질문", "플라트라이프가 유리한 케이스", "추가 문의"],
      },
    ],

    // FAQ 허브
    ({ primary_keyword }) => [
      {
        heading: `${primary_keyword}에 대해 가장 많이 묻는 것`,
        bullets: ["톱 3 질문 미리보기", "이 가이드를 이렇게 읽으세요"],
      },
      {
        heading: "💰 비용 관련 질문",
        bullets: ["월세와 주세 차이", "관리비 포함 항목", "보증금 환불 절차"],
      },
      {
        heading: "📋 계약 관련 질문",
        bullets: ["최소 계약 기간", "신분증 종류", "연장 가능 여부", "중도 해지"],
      },
      {
        heading: "🏠 입주 관련 질문",
        bullets: ["입주 시간", "키 수령", "청소 상태", "고장 수리"],
      },
      {
        heading: "🌏 외국인 특수 사항",
        bullets: ["여권만으로 계약?", "ARC 발급 지원 방법", "한국어 불필요"],
      },
      {
        heading: "🆘 문제 상황 FAQ",
        bullets: ["호스트 연락 안 될 때", "시설 고장 시", "사진과 방이 다를 때"],
      },
    ],
  ],

  dwell_time: [
    // 30일 일기
    ({ primary_keyword }) => [
      {
        heading: "시작 — 이 이야기의 배경",
        bullets: [
          "이름·국적·나이",
          "왜 한국에 왔는가",
          "이 방을 선택한 이유",
          "당시 설렘과 걱정",
        ],
      },
      {
        heading: `Day 1~3 — ${primary_keyword}에 도착해서`,
        bullets: [
          "공항에서 숙소까지",
          "체크인 첫 순간",
          "방의 첫인상",
          "첫날 밤의 기분",
        ],
      },
      {
        heading: "Day 4~10 — 리듬을 찾아가며",
        bullets: [
          "아침 루틴",
          "근처 카페와 마트",
          "동네 산책 중 발견한 곳",
          "이웃과의 첫 인사",
        ],
      },
      {
        heading: "Day 11~20 — 익숙해지는 순간",
        bullets: [
          "단골이 된 식당",
          "주말 나들이",
          "예상 못 한 어려움",
          "도움받은 사람들",
        ],
      },
      {
        heading: "Day 21~30 — 끝이 보이는 시간",
        bullets: [
          "아쉬움",
          "다음 계획",
          "돌아보며 가장 좋았던 것",
          "또 오고 싶은 이유",
        ],
      },
      {
        heading: "다음 여정 — 이 이야기의 후편",
        bullets: [
          "다음 도시 계획",
          "독자에게 전하는 팁 3가지",
          "관련 스토리 추천",
        ],
      },
    ],

    // 호스트 인터뷰
    ({ primary_keyword }) => [
      {
        heading: "호스트 소개 — 이 공간의 주인",
        bullets: [
          "이름·직업·경력",
          "이 방을 시작하게 된 계기",
          "첫 게스트를 맞이한 날",
        ],
      },
      {
        heading: `${primary_keyword} 운영 노하우`,
        bullets: [
          "방 꾸미기 철학",
          "청결 유지 루틴",
          "게스트 소통 방식",
          "리뷰에 대응하는 법",
        ],
      },
      {
        heading: "인상 깊었던 게스트 이야기",
        bullets: [
          "오래 머무른 장기 게스트",
          "특별한 사연을 가진 게스트",
          "잊지 못할 에피소드",
        ],
      },
      {
        heading: "숫자로 본 운영 — 실제 수익",
        bullets: [
          "월 평균 예약 건수",
          "순수익 구조",
          "재방문율",
          "비수기 대응",
        ],
      },
      {
        heading: "앞으로의 계획",
        bullets: [
          "추가 확장 여부",
          "게스트들에게 전하는 말",
          "예비 호스트에게 조언",
        ],
      },
    ],

    // 감성 에세이
    ({ primary_keyword }) => [
      {
        heading: "도착하던 날의 온도",
        bullets: ["그날의 공기", "택시 안 창밖 풍경", "첫 인상 단 하나의 이미지"],
      },
      {
        heading: `${primary_keyword}의 아침`,
        bullets: ["창문으로 들어오는 빛", "근처 카페의 원두 향", "사람들의 발걸음"],
      },
      {
        heading: "오후의 발견",
        bullets: ["우연히 들른 골목", "노포 식당의 주인", "아무도 모르는 서점"],
      },
      {
        heading: "저녁, 혼자의 시간",
        bullets: ["돌아오는 길의 감정", "방에서 켜는 첫 조명", "일기장에 적은 문장"],
      },
      {
        heading: "그리고, 다음 이야기",
        bullets: ["아쉬움과 만족", "돌아갈 곳과 남기고 갈 것", "추천하고 싶은 사람"],
      },
    ],
  ],
}

// ── 드래프트 생성 ──────────────────────────────────────────

/**
 * 섹션별 풍부한 마크다운 본문 생성.
 * 플라트라이프 브랜드 보이스 + 실제 매물 맥락 + KPI별 포맷 차별화.
 */
export function generateDraftSection(
  section: OutlineSection,
  target_kpi: TargetKPI,
  primary_keyword: string,
): string {
  if (target_kpi === "conversion") return generateConversionSection(section, primary_keyword)
  if (target_kpi === "traffic") return generateTrafficSection(section, primary_keyword)
  return generateDwellTimeSection(section, primary_keyword)
}

// 전환 — 매물 카드·가격표·FAQ·CTA 중심
function generateConversionSection(section: OutlineSection, keyword: string): string {
  const heading = section.heading.toLowerCase()

  // 추천 매물 섹션
  if (heading.includes("추천") || heading.includes("베스트") || heading.includes("매물")) {
    return SAMPLE_LISTINGS.map(
      (L, i) =>
        `### ${i + 1}. ${L.title}\n\n![${L.title}](https://placehold.co/800x400/74594b/fff?text=${encodeURIComponent(L.title)})\n\n- 📍 **위치**: ${L.location}\n- 💰 **월세**: ${L.price_monthly}만원 · 주세 ${L.price_weekly}만원\n- 🛏 **구조**: ${L.type}\n- ✨ **특징**: ${L.highlights.join(" · ")}\n\n> ${L.host_note}\n\n[이 방 둘러보기 →](#listing-${i + 1}) · [문의하기](#contact)`
    ).join("\n\n---\n\n")
  }

  // 가격·비교
  if (heading.includes("가격") || heading.includes("비교") || heading.includes("매트릭스")) {
    return `| 기간 | 보증금 있음 | 보증금 없음 | 관리비 포함? |\n|------|-------------|-------------|--------------|\n| 1주 | ₩150,000 | ₩190,000 | ✅ |\n| 2주 | ₩280,000 | ₩360,000 | ✅ |\n| 1개월 | ₩550,000 | ₩680,000 | ✅ |\n| 3개월 | ₩1,500,000 | ₩1,850,000 | ✅ |\n| 6개월 | ₩2,800,000 | ₩3,400,000 | ✅ |\n\n> 💡 **팁**: 3개월 이상 계약 시 평균 15% 할인이 적용됩니다. ${keyword} 카테고리에서 최저가 매물을 실시간으로 확인하세요.\n\n[더 많은 매물 비교 →](#compare)`
  }

  // 프로세스
  if (heading.includes("프로세스") || heading.includes("단계")) {
    return `### 1️⃣ 방 선택·문의 (소요: 1분)\n\n관심 있는 매물에서 **"이 방 문의하기"** 버튼만 누르면 됩니다. 카카오톡·영어 모두 가능합니다.\n\n### 2️⃣ 계약서 확인·결제 (소요: 5분)\n\n호스트가 최종 승인하면 전자 계약서가 발송됩니다. 계약서에는 입주일·퇴실일·보증금·환불 정책이 명시되어 있어요. 카드 결제·계좌이체·PayPal 중 편한 방법으로 결제하세요.\n\n### 3️⃣ 입주 당일 키박스 수령\n\n24시간 체크인 가능한 키박스 시스템입니다. 비행기 연착·야간 도착도 문제없어요. 문제가 생기면 24/7 한국어·영어 지원 라인으로 연락하세요.\n\n[지금 문의하기 →](#contact)`
  }

  // FAQ
  if (heading.includes("질문") || heading.includes("faq")) {
    return `**Q. 보증금은 언제 돌려받나요?**\n\n퇴실 확인 후 영업일 기준 3일 이내에 등록하신 계좌로 입금됩니다. 해외 계좌로도 송금 가능하며, 송금 수수료는 플라트라이프가 부담합니다.\n\n**Q. 입주 전 방을 직접 볼 수 있나요?**\n\n모든 매물은 실사 영상을 제공하며, 원하시면 화상통화로 라이브 투어도 가능합니다. 서울·수도권 인증 매물은 직접 방문도 예약 가능합니다.\n\n**Q. 외국인도 계약할 수 있나요?**\n\n네, 여권만 있으면 계약 가능합니다. 한국어가 어려워도 영어·중국어·베트남어·일본어로 계약서가 제공됩니다. **ARC(외국인등록증) 발급에 필요한 거주숙소제공확인서도 무료로 발급해드립니다.**\n\n**Q. 환불·취소 정책이 궁금합니다.**\n\n입주 15일 전: 100% 환불 / 7~14일 전: 80% / 1~6일 전: 60% / 당일 이후: 환불 불가입니다. 상세는 계약서에서 확인하세요.\n\n[더 많은 FAQ 보기 →](/blog/faqs)`
  }

  // 요약·안내 섹션
  if (heading.includes("요약") || heading.includes("빠른")) {
    return `**${keyword}** 수요가 가장 많은 지역을 기준으로 엄선한 매물만 소개합니다. 이 글에서 확인할 수 있는 내용:\n\n- ✅ 즉시 입주 가능한 검증된 매물 **10개**\n- ✅ 월세 **40~120만원** 예산대 전부 커버\n- ✅ 풀옵션(세탁기·냉장고·에어컨·침대·책상) 보장\n- ✅ **보증금 없는 옵션**도 포함\n- ✅ 외국인 ARC 발급 지원 매물 별도 표시\n\n한 매물이라도 눈에 들면 **카드의 '이 방 둘러보기' 버튼**을 눌러 더 많은 사진과 상세 정보를 확인하세요. 궁금한 점은 한국어·영어·중국어로 실시간 문의할 수 있어요.`
  }

  // CTA
  if (heading.includes("문의") || heading.includes("지금")) {
    return `**3초면 충분합니다.** 아래 방법 중 편한 걸로 문의하세요.\n\n- 💬 [카카오톡 1:1 채팅](#kakao) — 평균 응답 3분\n- 📧 [이메일 문의](mailto:hello@plottlife.com)\n- 🌐 24시간 웹 채팅 (우측 하단 아이콘)\n\n상담 가능 언어: 🇰🇷 한국어 / 🇺🇸 English / 🇨🇳 中文 / 🇻🇳 Tiếng Việt\n\n> 💡 **가성비 팁**: 신규 가입 시 첫 결제 5% 할인 쿠폰이 자동 발급됩니다.`
  }

  // fallback
  return section.bullets.map((b) => `- ${b}`).join("\n")
}

// 트래픽 — 구조화된 롱폼, FAQ 스키마, 내부링크 풍부
function generateTrafficSection(section: OutlineSection, keyword: string): string {
  const heading = section.heading.toLowerCase()

  if (heading.includes("이란") || heading.includes("무엇")) {
    return `**${keyword}**는 일반적인 월세·전세 계약과 달리 **1주~수개월 단위로 가구·가전이 완비된 방을 빌리는 방식**입니다. 2020년 이후 한국에서도 수요가 빠르게 늘고 있어요.\n\n### 기존 주거 방식과의 차이\n\n- **월세·전세**: 보통 12~24개월 계약, 빈 방(가구 없음), 복잡한 신분 확인\n- **에어비앤비**: 1박 단위 기반, 월 체류 시 비용 급증\n- **${keyword}**: 1주~20주 유연, 풀옵션, 외국인 친화적\n\n### 왜 최근 수요가 늘어날까\n\n디지털 노마드 증가, 유학생 수 회복, 기업 출장·파견 재개로 **"호텔보다 저렴하고 월세보다 유연한"** 중간지대 수요가 폭증했습니다. 특히 **[외국인 단기임대](/blog/foreigner-guide)** 카테고리가 가장 빠르게 성장하고 있어요.\n\n[관련 가이드: ${keyword} 비용 분석 →](#costs)`
  }

  if (heading.includes("유형") || heading.includes("종류")) {
    return `### 1. 주거형 단기임대 (풀옵션 원룸·오피스텔)\n\n가장 일반적입니다. 세탁기·냉장고·에어컨·침대·책상이 모두 갖춰진 독립 공간. 서울 기준 **월 40~80만원** 선이 대부분이며, 지하철역 근처는 약간 더 비쌉니다. 이 카테고리가 **${keyword}** 검색 결과의 80%를 차지해요.\n\n**적합한 대상**: 유학생, 1인 출장자, 한달살기\n\n### 2. 생활형 레지던스\n\n호텔처럼 로비·청소 서비스가 포함됩니다. 주재원·기업 파견 수요가 대부분이고, 비용은 **월 150~400만원**으로 높은 편. 대신 조식·헬스장·청소가 포함된 "호텔형 거주"가 장점입니다.\n\n**적합한 대상**: 기업 주재원, 장기 출장자\n\n### 3. 공유숙소 (쉐어하우스·고시원)\n\n1인실은 있지만 주방·욕실을 공유. 비용은 **월 25~45만원**으로 가장 저렴하지만 프라이버시가 제한됩니다.\n\n**적합한 대상**: 초단기 저예산, 친교 목적\n\n> 📌 플라트라이프는 1번 카테고리를 중심으로, 2번 일부 매물까지 다룹니다.`
  }

  if (heading.includes("비용") || heading.includes("가격")) {
    return `${keyword}의 실제 비용 구조를 항목별로 분해하겠습니다.\n\n### 월세·주세\n\n- **원룸**: 월 40~80만원 / 주 15~25만원\n- **투룸·오피스텔**: 월 70~130만원 / 주 25~40만원\n- **아파트 (전용면적 25㎡+)**: 월 120~200만원\n\n### 관리비\n\n보통 **월 5~12만원** 별도. 다만 플라트라이프 인증 매물은 95%가 관리비 포함 표기입니다.\n\n### 공과금\n\n전기·가스·수도는 **실비 후불 정산** 또는 **정액 포함** 중 매물별로 다릅니다. 계약 전 반드시 확인하세요.\n\n### 보증금\n\n- **보증금 있음**: 월세의 1~3배 (30~300만원)\n- **보증금 없음**: 월세가 약 20% 높은 대신 초기 비용 0원\n\n### 숨은 비용\n\n- 청소비 (퇴실 시 5~15만원)\n- Wi-Fi 업그레이드 (월 1~2만원)\n- 주차비 (월 3~8만원, 매물별)\n\n**[정확한 견적을 받고 싶다면 → 문의하기](#contact)**`
  }

  if (heading.includes("방법") || heading.includes("단계")) {
    return `### 1단계: 조건 정리\n\n- **지역**: 대학·직장 주변 or 지하철역 가까이\n- **기간**: 최소 1주~최대 20주\n- **예산**: 월 얼마까지 괜찮은지\n- **필수 조건**: 보증금 유무·반려동물·흡연\n\n### 2단계: 플랫폼 검색\n\n[플라트라이프](/)·직방·에어비앤비 등 주요 플랫폼에서 검색. 단기임대는 전용 플랫폼이 매물 품질·가격이 유리합니다.\n\n### 3단계: 매물 비교\n\n후보 3~5개를 Excel·메모로 비교하세요.\n\n| 매물 | 월세 | 지하철 | 특이사항 |\n|------|------|--------|----------|\n| A | 55만 | 5분 | 풀옵션 |\n| B | 60만 | 3분 | 보증금 없음 |\n\n### 4단계: 계약·결제\n\n전자계약서를 꼼꼼히 읽으세요. 특히 **환불 정책**과 **보증금 반환 일정** 확인.\n\n### 5단계: 입주 후 관리\n\n입주일 당일 방 상태를 사진·영상으로 기록. 문제가 있으면 24시간 이내 신고하세요.\n\n[단계별 상세 체크리스트 다운로드 →](/resources/checklist)`
  }

  if (heading.includes("faq") || heading.includes("질문")) {
    return section.bullets
      .map((b) => {
        const q = b.replace(/^Q\d+\.\s*/, "")
        return `**Q. ${q}**\n\n${faqAnswer(q, keyword)}`
      })
      .join("\n\n")
  }

  if (heading.includes("주의") || heading.includes("체크리스트")) {
    return `### 계약 전 반드시 확인할 7가지\n\n1. ✅ **계약서에 모든 비용이 명시되어 있는가** (월세·관리비·공과금·청소비)\n2. ✅ **보증금 반환 조건이 명확한가** (영업일 기준 며칠?)\n3. ✅ **환불·취소 정책**\n4. ✅ **입주 당일 키 수령 방법** (키박스 코드 or 대면)\n5. ✅ **시설 고장 시 수리 책임**\n6. ✅ **흡연·반려동물·손님 초대 규정**\n7. ✅ **실제 매물 사진과 일치하는지 영상 확인**\n\n### 외국인이 추가로 확인할 사항\n\n- 🌐 **ARC 발급용 거주숙소제공확인서** 발급 가능 여부\n- 🌐 **영문 계약서** 제공 여부\n- 🌐 **호스트와의 소통 언어**\n- 🌐 **여권 외 추가 서류** 요구 여부\n\n### 흔한 사기·실수 사례\n\n- ❌ 계약 전 선금 요구 (플랫폼 에스크로 외에는 금지)\n- ❌ 공동 현관 열쇠만 제공 (방 열쇠 필수)\n- ❌ 사진과 완전히 다른 방 (실사 영상 필수)`
  }

  if (heading.includes("관련") || heading.includes("더보기")) {
    return `이 가이드와 함께 보면 좋은 글:\n\n- 📍 [서울 한달살기 지역별 추천 — 강남 vs 홍대 vs 이태원](/blog/seoul-monthly-stay-guide-2026)\n- 🎓 [유학생을 위한 서울 대학별 기숙사 vs 단기임대 비교](/blog/student-housing-comparison)\n- 🏠 [보증금 없는 단기임대 찾는 법 — 8가지 팁](/blog/no-deposit-guide)\n- 📋 [외국인 계약 시 꼭 필요한 서류 총정리](/blog/foreigner-documents)\n- 💰 [단기임대 비용 절약 꿀팁 10가지](/blog/money-saving-tips)\n\n> 💡 **뉴스레터 구독 시** 매주 신규 매물 + 지역별 인사이트를 받아볼 수 있어요. [구독하기 →](#newsletter)`
  }

  return section.bullets.map((b) => `- ${b}`).join("\n")
}

function faqAnswer(q: string, keyword: string): string {
  return `${keyword}의 경우, 이 질문은 가장 자주 받는 것 중 하나입니다. 결론부터 말씀드리면 **매물·호스트마다 다르지만 일반적인 기준**은 다음과 같습니다. 예를 들어 플라트라이프에서는 보증금 반환이 퇴실 후 영업일 기준 3일 이내로 원칙이며, 환불 정책은 입주일 기준 단계별로 적용됩니다. 상세 답변은 각 매물 상세 페이지의 **정책 섹션**에서 확인하실 수 있습니다.`
}

// 체류시간 — 스토리·이미지·감성
function generateDwellTimeSection(section: OutlineSection, keyword: string): string {
  const heading = section.heading.toLowerCase()

  if (heading.includes("시작") || heading.includes("배경")) {
    return `![방으로 향하는 길](https://placehold.co/800x500/f7f5f2/74594b?text=arrival)\n\n비행기에서 내리자마자 공기가 달랐다. 3월의 서울은 생각보다 서늘했고, 가방을 끌고 공항철도를 타는데 손이 조금 떨렸다.\n\n> 내 이름은 **Linh**, 베트남에서 왔다. 나이 23, 한국어 전공 4년차, 교환학생으로 1학기. 서울은 처음이다.\n\n결정은 한 달 전에 내렸다. 호텔은 너무 비쌌고, 고시원은 혼자 지낼 자신이 없었다. 친구가 알려준 **플라트라이프**에서 ${keyword} 카테고리를 뒤적이다가, 이 방을 발견했다. 창문이 크고 책상이 있다는 점이 마음에 들었다.`
  }

  if (heading.match(/day\s*1/) || heading.includes("도착")) {
    return `![첫날 방 풍경](https://placehold.co/800x500/e8d9c2/74594b?text=first+day)\n\n**Day 1.** 키박스 번호 ****를 누르자 찰칵 소리와 함께 열쇠가 나왔다. 문을 열고 들어갔을 때, 가장 먼저 느낀 건 햇빛이었다. 사진보다 방이 밝았다.\n\n세탁기, 냉장고, 침대, 책상. 호스트가 말한 대로 다 있었다. 침대 위에 작은 환영 카드가 놓여 있었다.\n\n> "Welcome! 근처 편의점은 도보 2분이에요. 문제 있으면 아무 때나 연락주세요."\n\n**Day 2.** 아침에 일어나서 가장 먼저 한 일은 창문을 여는 것이었다. 어디선가 빵 굽는 냄새가 났다.\n\n**Day 3.** 근처 마트에서 장을 봤다. 한국어로 "카드 결제요"라고 말했는데 점원이 웃어줬다. 오늘의 작은 승리.`
  }

  if (heading.match(/day\s*4/) || heading.includes("리듬")) {
    return `![동네 카페](https://placehold.co/800x500/d4c4b0/74594b?text=morning+cafe)\n\n일주일이 지나자 아침 루틴이 생겼다.\n\n- ☕ **7:30** — 근처 '모닝글로리' 카페 (아메리카노 3,500원)\n- 📚 **9:00** — 방으로 돌아와 온라인 수업\n- 🍜 **12:30** — 학교 근처 분식집 (김밥 + 라볶이 6,000원)\n- 🚶 **18:00** — 동네 산책\n\n어느 날 동네 카페 주인이 내 얼굴을 알아봤다. "매일 오시네요?" 작은 순간이지만 마음이 따뜻해졌다. 집이라는 감각은 이런 순간들에서 시작된다.\n\n그리고 **방의 창문이 정말 큰 장점**이란 걸 그때 알았다. 아침 빛이 책상을 정확히 비추는데, 그게 모든 수업을 견디게 하는 힘이었다.`
  }

  if (heading.match(/day\s*11/) || heading.includes("익숙")) {
    return `![단골 식당](https://placehold.co/800x500/c8b59e/74594b?text=regular+spot)\n\n2주차가 지나자 몇 군데 단골이 생겼다. 이름 모를 할머니가 하시는 만둣국집. 가격은 7천 원, 만두는 손으로 빚는다.\n\n할머니가 한국어로 천천히 물어봤다. "어디서 왔어?" "베트남이요." "멀리 왔네." 그 말 한 마디가 오래 기억에 남았다.\n\n주말에는 처음으로 경복궁에 갔다. 한복을 입은 사람들을 보며, 나도 한번 입어보고 싶다고 생각했다. 다음 주 계획에 추가.\n\n> 예상 못 한 어려움도 있었다. 방의 인터넷이 한 번 끊겼는데, 호스트에게 카톡 보냈더니 **1시간 안에 기사분이 왔다**. 그 속도에 놀랐다.\n\n이쯤 되니, 방에 있을 때 "우리집"이라는 말이 자연스럽게 나왔다.`
  }

  if (heading.match(/day\s*21/) || heading.includes("끝")) {
    return `![창밖 풍경](https://placehold.co/800x500/a89080/74594b?text=goodbye)\n\n남은 날을 세기 시작한 건 Day 23쯤이었다.\n\n**Day 25.** 처음 갔던 카페에 마지막 방문. 주인이 "또 오세요"라고 했고, 나는 "또 올게요"라고 진심으로 답했다.\n\n**Day 28.** 방 정리를 시작했다. 세탁기를 돌리면서 처음 도착했을 때 느꼈던 서늘한 공기를 떠올렸다. 지금은 봄이다. 계절이 바뀌는 동안 이 방이 내 집이었다.\n\n**Day 30.** 키박스에 열쇠를 돌려놓고 문을 닫았다. 호스트에게 마지막 카톡을 보냈다:\n\n> "감사했어요. 여름에 다시 올게요."\n\n답장이 바로 왔다: **"언제든 환영이에요. 좋은 여행 되세요, 린 씨."**`
  }

  if (heading.includes("여정") || heading.includes("후편") || heading.includes("다음")) {
    return `다음 목적지는 **부산**이다. 2주. 이미 ${keyword}에서 바다가 보이는 방을 찜해뒀다.\n\n한국에서 한 달을 더 보내기로 한 건, 이 방 덕분이었다. 공간이 사람의 마음에 얼마나 영향을 주는지 이번에 알았다.\n\n### 독자에게 전하는 3가지 팁\n\n1. **창문 크기를 꼭 확인하세요.** 사진보다 중요합니다.\n2. **근처 카페·마트 위치를 Google 지도로 체크.** 도보 5분 이내가 이상적.\n3. **호스트의 응답 속도를 리뷰로 확인.** 말보다 행동이 중요합니다.\n\n---\n\n### 이 이야기를 좋아하셨다면\n\n- 📖 [디지털노마드의 제주 한달살기 — 바다가 보이는 방에서 일한다는 것](/blog/jeju-nomad-diary)\n- 📖 [호스트 인터뷰: 유학생 500명을 맞이한 서울 원룸의 운영법](/blog/host-500-students)\n- 📖 [외국인 친구와 함께한 홍대 2주 — 맛집 지도 공유](/blog/hongdae-2weeks)`
  }

  // fallback — 스토리 기조 유지
  return section.bullets
    .map((b) => `> ${b}`)
    .join("\n\n") + "\n\n_(이 섹션은 실제 LLM에서 호스트·게스트 인터뷰 데이터로 채워집니다.)_"
}

// ── 샘플 매물 ──────────────────────────────────────────

const SAMPLE_LISTINGS = [
  {
    title: "관악구 풀옵션 원룸 — 서울대 정문 도보 7분",
    location: "서울 관악구 봉천동",
    price_monthly: 58,
    price_weekly: 18,
    type: "원룸 (전용 16㎡)",
    highlights: ["풀옵션", "엘리베이터", "세탁기·건조기"],
    host_note: "조용한 주택가에 있는 밝은 원룸입니다. 큰 창문과 책상이 공부 분위기를 잘 만들어줘요.",
  },
  {
    title: "신촌 투룸 오피스텔 — 연세대·이대 중간",
    location: "서울 서대문구 창천동",
    price_monthly: 92,
    price_weekly: 28,
    type: "투룸 오피스텔 (전용 32㎡)",
    highlights: ["주방 분리형", "침실·거실 분리", "24시간 경비"],
    host_note: "2명이 함께 살아도 충분한 구조. 학기 단위 유학생에게 특히 인기가 많은 매물입니다.",
  },
  {
    title: "건대입구 보증금 0원 원룸",
    location: "서울 광진구 자양동",
    price_monthly: 65,
    price_weekly: 21,
    type: "원룸 (전용 18㎡)",
    highlights: ["보증금 없음", "건대 도보 10분", "편의점 1층"],
    host_note: "보증금 부담이 없어 첫 입주에 좋습니다. 월세에 보증금 부담분이 약간 반영되어 있어요.",
  },
  {
    title: "강남역 고층 오피스텔 — 출장자 선호",
    location: "서울 강남구 역삼동",
    price_monthly: 128,
    price_weekly: 38,
    type: "원룸 오피스텔 (전용 19㎡, 17F)",
    highlights: ["25층 고층", "헬스장·라운지", "세금계산서 발행"],
    host_note: "출장자 재예약률 높은 매물입니다. 지하철 2호선·신분당선 모두 도보 3분 이내.",
  },
  {
    title: "홍대입구 아담한 스튜디오",
    location: "서울 마포구 서교동",
    price_monthly: 72,
    price_weekly: 24,
    type: "원룸 (전용 14㎡)",
    highlights: ["홍대 중심", "커피숍·클럽 인근", "즉시 입주"],
    host_note: "젊은 디지털노마드·아티스트 게스트가 많은 방. 소음 있을 수 있어 취향에 따라 선택하세요.",
  },
] as const

// ── 전체 본문 한 번에 생성 ──────────────────────────────────────────

export function generateFullDraft(content: BlogContent): string {
  const outline = content.outline
  if (outline.length === 0) return ""

  const hero = `![${content.title}](https://placehold.co/1200x600/74594b/fff?text=${encodeURIComponent(content.title)})\n\n> **${content.target_audience}**을(를) 위한 가이드 · 예상 읽는 시간: ${estimateReadingTime(outline)}분`

  const intro = generateIntro(content)

  const body = outline
    .map(
      (s) =>
        `## ${s.heading}\n\n${generateDraftSection(s, content.target_kpi, content.primary_keyword)}`
    )
    .join("\n\n")

  const footer = generateFooter(content)

  return `${hero}\n\n${intro}\n\n${body}\n\n---\n\n${footer}`
}

function generateIntro(c: BlogContent): string {
  if (c.target_kpi === "conversion") {
    return `**${c.primary_keyword}** 때문에 이 글에 오셨나요? 잘 찾아오셨어요. 플라트라이프가 직접 검증한 매물 중에서 ${c.target_audience}에게 가장 잘 맞는 방만 골라서 정리했습니다. 바로 연락 가능한 매물만 있으니 맘에 드는 방은 **"이 방 둘러보기"** 버튼으로 상세 확인하세요.`
  }
  if (c.target_kpi === "traffic") {
    return `**${c.primary_keyword}**에 대해 검색하셨다면, 이 가이드가 도움이 될 거예요. 처음 이용하시는 분부터 경험자까지 모두 참고할 수 있도록 기본 개념부터 실전 팁·자주 묻는 질문·흔한 실수까지 한 번에 정리했습니다. 읽는 도중 필요한 섹션만 목차에서 바로 이동할 수 있어요.`
  }
  return `이 글은 **${c.primary_keyword}**에 대한 한 사람의 솔직한 기록입니다. 광고 글이 아니에요. 그 공간에서 한 달을 보낸 누군가의 일상, 감정, 발견을 그대로 담았습니다. 비슷한 여정을 고민 중이라면, 이 이야기가 작은 참고가 되기를.`
}

function generateFooter(c: BlogContent): string {
  const cta = {
    conversion: `### 지금 바로 문의하기\n\n- 💬 [카카오톡 1:1 채팅](#kakao)\n- 📧 [hello@plottlife.com](mailto:hello@plottlife.com)\n- 🌐 24시간 웹 채팅 (우측 하단)\n\n**신규 가입 시 첫 결제 5% 할인 쿠폰 자동 지급**`,
    traffic: `### 이 가이드가 도움이 되셨다면\n\n- 📬 [뉴스레터 구독](#newsletter) — 매주 신규 매물 + 지역 인사이트\n- 💾 [체크리스트 PDF 다운로드](/resources/checklist)\n- 🔔 관심 지역 알림 설정하면 신규 매물 오픈 시 바로 알려드려요`,
    dwell_time: `### 비슷한 이야기 더 보기\n\n- 📖 [디지털노마드 제주 한달살기 일기](/blog/jeju-nomad-diary)\n- 📖 [호스트 인터뷰 모음](/blog/host-interviews)\n- 📖 [외국인 유학생 정착 스토리](/blog/student-stories)`,
  }[c.target_kpi]

  return `${cta}\n\n---\n\n*이 글은 플라트라이프 에디토리얼 팀이 작성했습니다. 업데이트: ${new Date().toLocaleDateString("ko-KR")}*`
}

function estimateReadingTime(outline: OutlineSection[]): number {
  const approxWords = outline.reduce((s, sec) => s + sec.heading.length * 10 + sec.bullets.length * 80, 0)
  return Math.max(3, Math.round(approxWords / 500))
}
