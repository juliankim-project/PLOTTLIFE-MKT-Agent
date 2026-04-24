/**
 * 단기임대 플랫폼 (플라트라이프) 블로그 자동화 — 여정 7단계
 * 프레임워크 STAGES 구조를 그대로 유지하되 데이터는 단기임대 도메인으로.
 */

export interface Stage {
  id: StageId
  order: number
  label: string
  en: string
  color: string
  icon: IconName
  desc: string
  inputs: string[]
  outputs: string[]
  kpi: string
  kpiValue: string
  href: string
}

export type StageId =
  | "research"
  | "ideation"
  | "topics"
  | "write"
  | "review"
  | "publish"
  | "analyze"

export type IconName =
  | "search"
  | "sparkles"
  | "target"
  | "pen"
  | "check"
  | "send"
  | "chart"
  | "plus"
  | "chevron"
  | "chevronD"
  | "filter"
  | "calendar"
  | "link"
  | "upload"
  | "rss"
  | "trend"
  | "users"
  | "hash"
  | "sort"
  | "bolt"
  | "bookmark"
  | "eye"
  | "clock"
  | "grid"
  | "flow"
  | "globe"

export const STAGES: Stage[] = [
  {
    id: "research",
    order: 1,
    label: "키워드 트렌드",
    en: "Trends",
    color: "var(--stage-research)",
    icon: "trend",
    desc: "단기임대 시장 키워드의 월 검색량·경쟁도·시즌성을 관찰합니다. 파악 용도 — 실제 생성은 아이데이션에서.",
    inputs: ["네이버·구글 트렌드", "경쟁사 블로그 (엔코·미스터멘션)", "플라트 매물·게스트 리뷰"],
    outputs: ["트렌드 대시보드", "키워드 수치"],
    kpi: "트래킹 키워드",
    kpiValue: "65",
    href: "/blog/research",
  },
  {
    id: "ideation",
    order: 2,
    label: "아이데이션",
    en: "Ideation",
    color: "var(--stage-ideation)",
    icon: "sparkles",
    desc: "목적·세그먼트·상황 3축으로 주제를 생성하고 여정×목적 매트릭스에서 이번 라운드에 쓸 주제를 선정합니다.",
    inputs: ["3축 Compass", "자연어/키워드 검색", "페르소나"],
    outputs: ["선정된 주제 (shortlist)"],
    kpi: "선정 주제",
    kpiValue: "—",
    href: "/blog/ideation",
  },
  {
    id: "topics",
    order: 3,
    label: "브리프 작성",
    en: "Brief",
    color: "var(--stage-topic)",
    icon: "target",
    desc: "선정된 주제로 Content Strategist가 아웃라인·페르소나·KPI·CTA 포인트를 담은 상세 브리프를 생성합니다.",
    inputs: ["선정 주제", "여정 단계", "목적(Intent)"],
    outputs: ["아웃라인", "키워드 세트", "CTA 힌트"],
    kpi: "브리프 준비",
    kpiValue: "—",
    href: "/blog/topics",
  },
  {
    id: "write",
    order: 4,
    label: "콘텐츠 제작",
    en: "Create",
    color: "var(--stage-write)",
    icon: "pen",
    desc: "브리프 기반으로 본문을 생성·편집합니다. 여정 단계별 POV + 플라트 보이스 가이드 자동 적용.",
    inputs: ["브리프", "톤 가이드", "여정 POV"],
    outputs: ["본문 · 이미지 슬롯"],
    kpi: "작성 중",
    kpiValue: "—",
    href: "/blog/write",
  },
  {
    id: "review",
    order: 5,
    label: "검수",
    en: "Review",
    color: "var(--stage-review)",
    icon: "check",
    desc: "SEO·팩트·서비스 정확성(ARC 발급 등)·톤을 체크리스트로 교차검증합니다.",
    inputs: ["초안", "체크리스트", "승인 규칙"],
    outputs: ["승인본"],
    kpi: "검수 대기",
    kpiValue: "2",
    href: "/blog/review",
  },
  {
    id: "publish",
    order: 6,
    label: "발행",
    en: "Publish",
    color: "var(--stage-publish)",
    icon: "send",
    desc: "오피셜 블로그·뉴스레터·소셜·Medium 영문 채널로 변환해 예약/발행합니다.",
    inputs: ["승인본", "채널 계정", "스케줄"],
    outputs: ["발행물", "메타 태그"],
    kpi: "예약",
    kpiValue: "4",
    href: "/blog/publish",
  },
  {
    id: "analyze",
    order: 7,
    label: "성과분석",
    en: "Analyze",
    color: "var(--stage-analyze)",
    icon: "chart",
    desc: "트래픽·예약 전환·SERP 랭킹을 학습해 다음 여정의 인풋으로 회수합니다.",
    inputs: ["GA4·Search Console", "네이버 웹마스터", "플라트 예약 로그"],
    outputs: ["대시보드", "학습 피드백"],
    kpi: "이번 달 PV",
    kpiValue: "182K",
    href: "/blog/analyze",
  },
]

export const STAGE_BY_ID: Record<StageId, Stage> = Object.fromEntries(
  STAGES.map((s) => [s.id, s])
) as Record<StageId, Stage>

/** 단기임대 블로그 페르소나 */
export interface Persona {
  id: string
  label: string
  desc: string
  match: number
}

export const PERSONAS: Persona[] = [
  { id: "student", label: "외국인 유학생", desc: "D-2·D-4, ARC·은행·기숙사 대체", match: 0.94 },
  { id: "expat", label: "주재원·법인 이동자", desc: "E비자·가족 동반·프리미엄", match: 0.82 },
  { id: "traveler", label: "한달살기 여행자", desc: "1주~3개월·계절·라이프스타일", match: 0.88 },
  { id: "nomad", label: "디지털 노마드", desc: "워케이션·코워킹·중장기", match: 0.76 },
  { id: "korean", label: "내국인 이사 과도기", desc: "이사 공백·타지 발령·재계약", match: 0.61 },
]
