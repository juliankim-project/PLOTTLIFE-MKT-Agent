/**
 * Blog content pipeline schema
 * — Phase 1 MVP —
 *
 * 핵심: 모든 콘텐츠는 target_kpi를 가진다.
 * KPI에 따라 아이데이션·작성·측정·최적화 전략이 분기된다.
 */

export type TargetKPI =
  | "conversion" // 예약 전환
  | "traffic" // 오가닉 트래픽
  | "dwell_time" // 체류시간 / 브랜드 스토리

export type ContentStatus =
  | "idea" // 아이디어만 있음
  | "scheduled" // 일정 확정, 작성 대기
  | "drafting" // 초안 작성 중
  | "reviewing" // 검수 중
  | "published" // 발행됨
  | "rewriting" // 리라이트 중 (저성과 재작성)

export type ContentType =
  | "region-guide" // 지역 가이드
  | "lifestyle" // 라이프스타일
  | "host-story" // 호스트 스토리
  | "guest-story" // 게스트/유학생 스토리
  | "seo-longtail" // SEO 롱테일
  | "partnership" // 제휴·파트너십

export interface BlogContent {
  id: string
  title: string
  slug: string
  content_type: ContentType
  target_kpi: TargetKPI
  status: ContentStatus

  // 아이데이션 입력
  primary_keyword: string
  secondary_keywords: string[]
  target_audience: string // "유학생" | "디지털노마드" | "내국인 전근" 등
  outline: OutlineSection[]

  // 드래프트
  body_markdown?: string
  hero_image_prompt?: string
  hero_image_url?: string

  // 스케줄
  scheduled_at?: string // ISO date
  published_at?: string

  // 성과 (발행 후)
  metrics?: ContentMetrics

  // 메타
  created_at: string
  updated_at: string
  assigned_agent_id?: string // 에이전트 7명 중 누구인지
}

export interface OutlineSection {
  heading: string
  bullets: string[]
}

export interface ContentMetrics {
  page_views: number
  unique_visitors: number
  avg_dwell_time_sec: number
  scroll_depth_pct: number
  bounce_rate_pct: number
  // 전환
  cta_clicks: number
  booking_conversions: number
  conversion_rate_pct: number
  // 트래픽
  organic_visits: number
  top_queries: string[]
  last_updated: string
}

// ── KPI별 좋은 콘텐츠 정의 ─────────────────────

export const KPI_DEFINITIONS = {
  conversion: {
    label: "예약 전환",
    icon: "💰",
    color: "#10B981",
    description: "검색 → 숙소 비교 → 예약까지 최단 경로",
    good_content: "지역·대학별 숙소 추천, 가격 비교, FAQ (보증금/계약)",
    success_metric: "CTA 클릭률, 예약 전환율",
    optimization_levers: [
      "CTA 밀도 (섹션마다 매물 임베드)",
      "가격·기간별 비교 테이블",
      "FAQ (보증금·환불·ARC)",
      "긴급성 (매물 마감 임박 표시)",
    ],
  },
  traffic: {
    label: "오가닉 트래픽",
    icon: "📈",
    color: "#3B82F6",
    description: "구글·네이버 검색에서 자연 유입",
    good_content: "롱테일 키워드 가이드, 지역별 정보 허브, 비교 페이지",
    success_metric: "오가닉 방문, 평균 순위, 인덱싱 페이지 수",
    optimization_levers: [
      "타겟 키워드 밀도 1~2%",
      "H2/H3 구조화 + FAQ 스키마",
      "내부링크 (지역·카테고리 허브로)",
      "글자 수 2,000~3,500자 (롱테일)",
    ],
  },
  dwell_time: {
    label: "체류시간 / 브랜드",
    icon: "📖",
    color: "#8B5CF6",
    description: "브랜드 스토리·몰입·신뢰 — 체류시간과 재방문",
    good_content: "유학생·호스트 인터뷰, 한달살기 브이로그, 지역 깊이 탐방",
    success_metric: "평균 체류시간, 스크롤 깊이, 재방문율",
    optimization_levers: [
      "이미지 밀도 (글 300자마다 1장)",
      "인용·대화체·스토리 흐름",
      "섹션 당 400~600자 (스크롤 리듬)",
      "관련 스토리 추천 (체인 읽기)",
    ],
  },
} as const

// ── 콘텐츠 타입별 KPI 적합도 ─────────────────────

export const CONTENT_TYPE_KPI_MATRIX: Record<
  ContentType,
  { label: string; best_for: TargetKPI; avg_length: string; example_title: string }
> = {
  "region-guide": {
    label: "지역 가이드",
    best_for: "traffic",
    avg_length: "2,500~3,500자",
    example_title: "서울대 근처 한달살기 방 추천 TOP 10",
  },
  lifestyle: {
    label: "라이프스타일",
    best_for: "dwell_time",
    avg_length: "1,800~2,500자",
    example_title: "한국 유학생 첫 자취 1개월, 이렇게 정착했습니다",
  },
  "host-story": {
    label: "호스트 스토리",
    best_for: "dwell_time",
    avg_length: "1,500~2,200자",
    example_title: "20평 원룸으로 월 300만원 수익을 만든 호스트 인터뷰",
  },
  "guest-story": {
    label: "게스트 스토리",
    best_for: "dwell_time",
    avg_length: "1,500~2,200자",
    example_title: "베트남 유학생이 처음 한국에서 방 구한 이야기",
  },
  "seo-longtail": {
    label: "SEO 롱테일",
    best_for: "traffic",
    avg_length: "2,000~3,000자",
    example_title: "서울 단기임대 보증금 없는 방 찾는 법",
  },
  partnership: {
    label: "제휴·파트너십",
    best_for: "conversion",
    avg_length: "1,200~1,800자",
    example_title: "연세대 국제처 추천 — 유학생 단기임대 가이드",
  },
}
