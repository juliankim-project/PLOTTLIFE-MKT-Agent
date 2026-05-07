/**
 * Ideation Funnel — Guest Journey + Category Drill-down
 * --------------------------------------------------------------
 * 4단계 드릴다운
 *   1. 여정 (Journey Stage)         e.g. 📋 Prepare
 *   2. 키워드 단위 (Audience/상황)   e.g. 🎓 유학생 준비
 *   3. 주제 카테고리 (앵글)           e.g. 🪪 비자
 *   4. 주제 (Topic)                  e.g. D-2 유학 비자 완벽 가이드
 *
 * 게스트 여정 7단계
 *   1. 🤔 Consider · 고민 중
 *   2. 📋 Prepare  · 출국 준비
 *   3. ✈️ Arrive   · 막 도착
 *   4. 🏡 Settle   · 서류·계정 세팅
 *   5. 🌱 Live     · 일상 적응
 *   6. 🗺 Explore  · 동네·주말·시즌
 *   7. 🔄 Change   · 연장·이사·귀국
 */

import type { TargetKPI } from "./schema"

// ── Common types ────────────────────────────────────

export type SignalKind =
  | "seo-gap"
  | "top-performer"
  | "seasonal"
  | "competitor-miss"
  | "search-rising"
  | "evergreen"

export interface Signal {
  kind: SignalKind
  detail: string
}

export const SIGNAL_BADGES: Record<SignalKind, { label: string; bg: string; fg: string }> = {
  "seo-gap": { label: "SEO 갭", bg: "#DBEAFE", fg: "#1D4ED8" },
  "top-performer": { label: "성과 패턴", bg: "#D1FAE5", fg: "#047857" },
  seasonal: { label: "시즌성", bg: "#FEF3C7", fg: "#B45309" },
  "competitor-miss": { label: "경쟁사 미커버", bg: "#FCE7F3", fg: "#BE185D" },
  "search-rising": { label: "검색 급상승", bg: "#EDE9FE", fg: "#6D28D9" },
  evergreen: { label: "상시 수요", bg: "#F3F4F6", fg: "#374151" },
}

export type Pillar = "stay" | "living" | "local"

export const PILLAR_META: Record<Pillar, { label: string; icon: string; color: string }> = {
  stay: { label: "Stay · 숙소", icon: "🏠", color: "#0EA5E9" },
  living: { label: "Living · 정착", icon: "🌱", color: "#10B981" },
  local: { label: "Local · 동네", icon: "🗺", color: "#F59E0B" },
}

export const KPI_SHORT: Record<TargetKPI, { label: string; icon: string; color: string }> = {
  conversion: { label: "전환", icon: "💰", color: "#10B981" },
  traffic: { label: "트래픽", icon: "📈", color: "#3B82F6" },
  dwell_time: { label: "체류", icon: "📖", color: "#8B5CF6" },
}

export interface Topic {
  title: string
  kpi: TargetKPI
  rationale: string
  signal: Signal
  difficulty: "low" | "medium" | "high"
  impact: "high" | "medium" | "low"
  leadAgent: string
  supportAgents: string[]
  relatedKeywords: string[]
  /** 발행 시 묶일 카테고리 허브 — 주제 단계에서만 사후 태깅 */
  pillar: Pillar
  /** 주제 카테고리(앵글) — 드릴다운 3단계 */
  category: string
  /** 카테고리 아이콘 (이모지) */
  categoryIcon: string
}

export interface FunnelNode {
  id: string
  label: string
  icon?: string
  description?: string
  reason?: string
  signal?: Signal
  priority?: "high" | "medium" | "low"
  keywordVolume?: string
  children?: FunnelNode[]
  topics?: Topic[]
}

export const PRIORITY_STYLES: Record<
  "high" | "medium" | "low",
  { label: string; bg: string; fg: string }
> = {
  high: { label: "우선순위 높음", bg: "#FEE2E2", fg: "#B91C1C" },
  medium: { label: "중간", bg: "#FEF3C7", fg: "#B45309" },
  low: { label: "낮음", bg: "#F3F4F6", fg: "#4B5563" },
}

// ════════════════════════════════════════════════════
// FUNNEL TREE
// ════════════════════════════════════════════════════

export const FUNNEL_TREE: FunnelNode[] = [
  // 1. 🤔 CONSIDER
  {
    id: "consider",
    label: "고민 중이에요",
    icon: "🤔",
    description: "한국 올까 말까 · 비용·기간·방식 탐색",
    priority: "high",
    children: [
      {
        id: "consider-study",
        label: "유학 고민",
        icon: "🎓",
        priority: "high",
        topics: [
          {
            title: "한국 유학 비용 진짜 얼마 들까 — 1년 총정리",
            kpi: "traffic",
            category: "비용·예산",
            categoryIcon: "💰",
            rationale: "출국 6개월 전 가장 많이 검색. 예산 감잡기 리서치.",
            signal: { kind: "evergreen", detail: "'한국 유학 비용' 월 3.4k 상시" },
            difficulty: "low",
            impact: "high",
            leadAgent: "stra",
            supportAgents: ["search", "haru"],
            relatedKeywords: ["한국 유학 비용", "유학 예산", "study in Korea cost"],
            pillar: "living",
          },
          {
            title: "어학당 vs 학부 — 어떻게 시작할지 결정하는 법",
            kpi: "dwell_time",
            category: "경로 선택",
            categoryIcon: "🛤",
            rationale: "유학 고민자 핵심 분기. 두 경로 비교 콘텐츠 부족.",
            signal: { kind: "seo-gap", detail: "어학당 vs 학부 비교 TOP 10 중 2건" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["haru"],
            relatedKeywords: ["어학당 vs 학부", "D-4 D-2 차이"],
            pillar: "living",
          },
          {
            title: "외국인이 한국 대학 고르는 법 — 순위·전공·분위기",
            kpi: "traffic",
            category: "학교·전공",
            categoryIcon: "🏫",
            rationale: "유학 결정 전 허브 글. 장수 SEO + 대학 리스트 내부링크.",
            signal: { kind: "seo-gap", detail: "외국인용 한국 대학 가이드 부족" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["한국 대학 순위", "universities Korea", "외국인 대학 선택"],
            pillar: "living",
          },
          {
            title: "한국 유학 장단점 — 1년 다녀온 선배들 솔직 후기",
            kpi: "dwell_time",
            category: "리얼 후기",
            categoryIcon: "📝",
            rationale: "감성·리얼 후기. 브랜드 신뢰·체류 시간.",
            signal: { kind: "competitor-miss", detail: "리얼 후기 각도 경쟁 약함" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["한국 유학 후기", "study in Korea review"],
            pillar: "living",
          },
        ],
      },
      {
        id: "consider-expat",
        label: "주재원 제안 받음",
        icon: "💼",
        priority: "medium",
        topics: [
          {
            title: "한국 주재원 제안 받았다 — 수락 전 5가지 체크",
            kpi: "traffic",
            category: "의사결정",
            categoryIcon: "✅",
            rationale: "결정 전 단계 타겟. 법인 HR·가족 함께 검색.",
            signal: { kind: "competitor-miss", detail: "주재원 의사결정 각도 경쟁 0" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["search"],
            relatedKeywords: ["한국 주재원", "expat offer Korea", "파견 고민"],
            pillar: "living",
          },
          {
            title: "서울 주재원 생활비 — 가족 포함 월 얼마 필요할까",
            kpi: "traffic",
            category: "비용·가족",
            categoryIcon: "💸",
            rationale: "가족 주재 결정 전 리서치. 고단가 매물 인지 브리지.",
            signal: { kind: "seo-gap", detail: "가족 주재원 생활비 상위 부족" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["주재원 생활비", "expat cost Seoul"],
            pillar: "living",
          },
          {
            title: "주재원 1년 차 솔직 후기 — 장단점·후회·조언",
            kpi: "dwell_time",
            category: "리얼 후기",
            categoryIcon: "📝",
            rationale: "의사결정 단계 체류시간 콘텐츠. 신뢰 레버.",
            signal: { kind: "competitor-miss", detail: "리얼 후기 각도 경쟁 0" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["주재원 후기", "expat Korea review"],
            pillar: "living",
          },
        ],
      },
      {
        id: "consider-nomad",
        label: "노마드 이동 고려",
        icon: "🌏",
        priority: "medium",
        topics: [
          {
            title: "디지털노마드 한국, 왜 요즘 떠오를까 — 비자·인프라 총정리",
            kpi: "traffic",
            category: "한국 선택 이유",
            categoryIcon: "🌐",
            rationale: "노마드 커뮤니티 공유 활발. 다국어 리퍼포징 유리.",
            signal: { kind: "search-rising", detail: "digital nomad Korea +52% YoY" },
            difficulty: "medium",
            impact: "high",
            leadAgent: "stra",
            supportAgents: ["search", "social"],
            relatedKeywords: ["digital nomad Korea", "노마드 서울"],
            pillar: "living",
          },
          {
            title: "한국 노마드 비자 — F-1 방문 vs 관광 vs 디지털노마드 비자",
            kpi: "traffic",
            category: "비자",
            categoryIcon: "🪪",
            rationale: "비자 불확실성 해소 → 안전한 방 예약으로 연결.",
            signal: { kind: "seo-gap", detail: "노마드 비자 가이드 상위 부족" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["노마드 비자", "F-1 비자", "digital nomad visa"],
            pillar: "living",
          },
          {
            title: "한국 노마드 월 생활비 — 서울·부산·제주 실제 후기",
            kpi: "traffic",
            category: "생활비",
            categoryIcon: "💸",
            rationale: "3개 도시 비교 허브. 내부링크 구조 유리.",
            signal: { kind: "search-rising", detail: "'Korea nomad cost' +38% YoY" },
            difficulty: "low",
            impact: "high",
            leadAgent: "search",
            supportAgents: ["social"],
            relatedKeywords: ["noma cost Korea", "서울 노마드 비용"],
            pillar: "living",
          },
        ],
      },
      {
        id: "consider-stay",
        label: "한달살기·단기 체류 계획",
        icon: "🌸",
        priority: "high",
        topics: [
          {
            title: "한국 한달살기 감잡기 — 예산·기간·지역 한눈에",
            kpi: "traffic",
            category: "전반 가이드",
            categoryIcon: "🗺",
            rationale: "Top Performer 패턴. 리서치 단계 허브 글.",
            signal: { kind: "top-performer", detail: "한달살기 월 18.5k 조회 안정" },
            difficulty: "low",
            impact: "high",
            leadAgent: "search",
            supportAgents: ["stra", "haru"],
            relatedKeywords: ["한달살기", "한국 한달"],
            pillar: "stay",
          },
          {
            title: "1주 / 1개월 / 3개월 — 체류 기간 정하는 법",
            kpi: "traffic",
            category: "기간 선택",
            categoryIcon: "⏱",
            rationale: "플라트 차별화 포인트(1주~20주) 허브로 연결.",
            signal: { kind: "seo-gap", detail: "기간별 비교 글 경쟁 약함" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["search"],
            relatedKeywords: ["1주 단기임대", "1개월 단기", "weekly stay Korea"],
            pillar: "stay",
          },
          {
            title: "서울 vs 부산 vs 제주 — 한달살기 어디로 갈까",
            kpi: "dwell_time",
            category: "지역 비교",
            categoryIcon: "🏘",
            rationale: "도시 비교는 체류시간 상위 패턴.",
            signal: { kind: "evergreen", detail: "지역 비교 상시 수요" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["social", "haru"],
            relatedKeywords: ["서울 한달살기", "부산 한달살기", "제주 한달살기"],
            pillar: "local",
          },
          {
            title: "한달살기 비용 계산기 — 지역·숙소·기간별 시세",
            kpi: "traffic",
            category: "비용 계산",
            categoryIcon: "🧮",
            rationale: "계산기·시세 허브. 내부링크 다수로 SEO 탄탄.",
            signal: { kind: "evergreen", detail: "시세 검색 상시" },
            difficulty: "medium",
            impact: "high",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["한달살기 비용", "시세 계산기", "monthly cost"],
            pillar: "stay",
          },
          {
            title: "한달살기 짐 리스트 — 꼭 필요한 것 vs 현지 구매",
            kpi: "dwell_time",
            category: "짐·준비물",
            categoryIcon: "🎒",
            rationale: "출발 직전 체크리스트. 소셜 공유 활발.",
            signal: { kind: "seasonal", detail: "여행 성수기 전 검색 피크" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["한달살기 짐", "packing list Korea"],
            pillar: "living",
          },
        ],
      },
    ],
  },

  // 2. 📋 PREPARE
  {
    id: "prepare",
    label: "출국 준비 중이에요",
    icon: "📋",
    description: "비자·서류·짐·첫 숙소 예약",
    priority: "high",
    signal: { kind: "seasonal", detail: "2월·8월 신학기 전 트래픽 +180%" },
    children: [
      {
        id: "prepare-student",
        label: "유학생 출국 준비",
        icon: "🎓",
        priority: "high",
        topics: [
          {
            title: "D-2 유학 비자 완벽 가이드 — 신청부터 입국까지",
            kpi: "traffic",
            category: "비자",
            categoryIcon: "🪪",
            rationale: "비자 검색은 장수 SEO. 상위 안정 유지 가능.",
            signal: { kind: "evergreen", detail: "D-2 비자 월 1.5k 꾸준" },
            difficulty: "low",
            impact: "high",
            leadAgent: "search",
            supportAgents: ["stra", "haru"],
            relatedKeywords: ["D-2 비자", "유학 비자 신청", "student visa Korea"],
            pillar: "living",
          },
          {
            title: "어학당 D-4 비자 — 단기 한국어 코스용",
            kpi: "traffic",
            category: "비자",
            categoryIcon: "🪪",
            rationale: "어학당(3~6개월)은 플라트 기간 완벽 매칭.",
            signal: { kind: "seo-gap", detail: "D-4 각도 경쟁 약함" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["D-4 비자", "어학당 비자"],
            pillar: "living",
          },
          {
            title: "한국 오기 전 꼭 준비할 10가지 — 유학생 체크리스트",
            kpi: "traffic",
            category: "체크리스트",
            categoryIcon: "✅",
            rationale: "출국 직전 검색 피크. 첫 숙소 예약 유도.",
            signal: { kind: "seasonal", detail: "신학기 전 트래픽 폭증" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["haru"],
            relatedKeywords: ["유학 준비", "한국 짐", "before Korea"],
            pillar: "living",
          },
          {
            title: "기숙사 vs 자취 — 서울 주요 대학 비교로 결정하기",
            kpi: "conversion",
            category: "거주 결정",
            categoryIcon: "🏠",
            rationale: "기숙사 탈락자 직접 타겟. 플라트 매물 1:1 매칭.",
            signal: { kind: "search-rising", detail: "기숙사 탈락 검색 증가" },
            difficulty: "low",
            impact: "high",
            leadAgent: "stra",
            supportAgents: ["search"],
            relatedKeywords: ["기숙사 탈락", "서울 유학생 자취"],
            pillar: "stay",
          },
          {
            title: "유학생 건강보험 — 학교 보험 vs NHIS 비교",
            kpi: "traffic",
            category: "보험",
            categoryIcon: "🏥",
            rationale: "입학 직전 필수. 세부 비교 콘텐츠 부족.",
            signal: { kind: "seo-gap", detail: "NHIS vs 학교보험 비교 TOP 10 부재" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["유학생 건강보험", "NHIS foreigner", "학교 보험"],
            pillar: "living",
          },
          {
            title: "한국 유학 장학금 정리 — GKS·교내·민간 한눈에",
            kpi: "traffic",
            category: "장학금",
            categoryIcon: "🎓",
            rationale: "출국 전 리서치 핵심. 대형 허브 글 가능.",
            signal: { kind: "evergreen", detail: "장학금 검색 상시" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["GKS 장학금", "한국 유학 장학금", "Korean scholarship"],
            pillar: "living",
          },
        ],
      },
      {
        id: "prepare-expat",
        label: "주재원 파견 준비",
        icon: "💼",
        priority: "medium",
        topics: [
          {
            title: "E비자 주재원 한국 파견 완벽 가이드",
            kpi: "traffic",
            category: "비자",
            categoryIcon: "🪪",
            rationale: "법인 HR 타겟 유입. B2B 제휴 브리지.",
            signal: { kind: "seo-gap", detail: "주재원 비자 가이드 블루오션" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["E비자 주재원", "expat visa Korea"],
            pillar: "living",
          },
          {
            title: "회사 지원 없이 한국 파견 — 개인 준비 체크리스트",
            kpi: "traffic",
            category: "개인 준비",
            categoryIcon: "📋",
            rationale: "스타트업·중소기업 주재원 타겟. 경쟁 부재.",
            signal: { kind: "competitor-miss", detail: "경쟁 부재" },
            difficulty: "medium",
            impact: "low",
            leadAgent: "stra",
            supportAgents: ["haru"],
            relatedKeywords: ["주재원 개인 준비", "expat self setup"],
            pillar: "living",
          },
          {
            title: "가족과 함께 주재 — 자녀 학교·배우자 생활 먼저 정하기",
            kpi: "traffic",
            category: "가족 동반",
            categoryIcon: "👨‍👩‍👧",
            rationale: "가족 주재원은 투룸·아파트 수요. LTV 최상.",
            signal: { kind: "competitor-miss", detail: "가족 주재원 경쟁 0" },
            difficulty: "high",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["search"],
            relatedKeywords: ["국제학교 서울", "주재원 자녀", "expat family Seoul"],
            pillar: "living",
          },
          {
            title: "국제학교 입학 타임라인 — 9월 학년제 vs 3월 학년제",
            kpi: "traffic",
            category: "국제학교",
            categoryIcon: "🏫",
            rationale: "파견 시점 결정 요인. 고단가 가족 세그먼트.",
            signal: { kind: "seo-gap", detail: "국제학교 캘린더 경쟁 약함" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["국제학교 입학", "international school admission"],
            pillar: "living",
          },
        ],
      },
      {
        id: "prepare-stay-booking",
        label: "첫 숙소 예약",
        icon: "🛏",
        priority: "high",
        topics: [
          {
            title: "보증금 0원 단기임대 추천 TOP 10 — 서울 전 지역",
            kpi: "conversion",
            category: "예산대별",
            categoryIcon: "💰",
            rationale: "보증금 없음은 외국인 최우선 필터. 상위 랭크 기회 큼.",
            signal: { kind: "search-rising", detail: "'보증금 없는 단기임대' +45% MoM" },
            difficulty: "low",
            impact: "high",
            leadAgent: "search",
            supportAgents: ["stra", "haru"],
            relatedKeywords: ["보증금 없는 방", "보증금 0원", "no deposit Seoul"],
            pillar: "stay",
          },
          {
            title: "월 50만원대 서울 단기임대 — 가성비 매물 완벽 정리",
            kpi: "conversion",
            category: "예산대별",
            categoryIcon: "💰",
            rationale: "예산 민감 유학생·노마드 타겟. CTR 높음.",
            signal: { kind: "evergreen", detail: "월 1.2k 안정 검색" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["50만원 단기임대", "가성비 원룸"],
            pillar: "stay",
          },
          {
            title: "3~6개월 중장기 단기임대 — 주재원·교환학생",
            kpi: "conversion",
            category: "기간별",
            categoryIcon: "⏱",
            rationale: "객단가×기간 효과 최대. 주재원·학기 타겟 정확.",
            signal: { kind: "seo-gap", detail: "중장기 키워드 커버 약함" },
            difficulty: "medium",
            impact: "high",
            leadAgent: "stra",
            supportAgents: ["search"],
            relatedKeywords: ["3개월 단기임대", "한 학기 방", "mid-term stay"],
            pillar: "stay",
          },
          {
            title: "프리미엄 레지던스형 단기임대 — 주재원·임원용",
            kpi: "conversion",
            category: "프리미엄",
            categoryIcon: "💎",
            rationale: "고단가 세그먼트. 플라트 객단가 상위 매물과 매칭.",
            signal: { kind: "competitor-miss", detail: "서비스드레지던스 대안 경쟁 약함" },
            difficulty: "high",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["pulse"],
            relatedKeywords: ["서비스드레지던스", "주재원 숙소", "executive housing"],
            pillar: "stay",
          },
          {
            title: "반려동물 동반 단기임대 — 서울 pet-friendly 매물",
            kpi: "conversion",
            category: "특수 니즈",
            categoryIcon: "🐶",
            rationale: "경쟁 약함 + 반려 인구 증가. 필터 정확 매칭.",
            signal: { kind: "seo-gap", detail: "pet friendly 필터 경쟁 부족" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["반려동물 단기임대", "pet-friendly apartment"],
            pillar: "stay",
          },
          {
            title: "여성 혼자 안전한 서울 동네 — 단기임대 추천",
            kpi: "conversion",
            category: "특수 니즈",
            categoryIcon: "🛡",
            rationale: "안전 필터는 강력한 결정 요인. 경쟁 약함.",
            signal: { kind: "competitor-miss", detail: "안전 각도 경쟁 부족" },
            difficulty: "low",
            impact: "high",
            leadAgent: "stra",
            supportAgents: ["search"],
            relatedKeywords: ["여자 혼자 서울", "safe Seoul neighborhood"],
            pillar: "stay",
          },
        ],
      },
    ],
  },

  // 3. ✈️ ARRIVE
  {
    id: "arrive",
    label: "방금 도착했어요",
    icon: "✈️",
    description: "공항·첫 체크인·첫 며칠 버티기",
    priority: "medium",
    children: [
      {
        id: "arrive-airport",
        label: "공항에서 숙소까지",
        icon: "🛬",
        priority: "medium",
        topics: [
          {
            title: "인천공항에서 숙소까지 — 외국인 첫 이동 가이드",
            kpi: "traffic",
            category: "이동 방법",
            categoryIcon: "🚌",
            rationale: "도착 당일 검색 → 플라트 매물 인지. 전환 브리지.",
            signal: { kind: "seo-gap", detail: "공항→숙소 가이드 경쟁 약함" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["인천공항 숙소", "공항 리무진", "airport to apartment"],
            pillar: "living",
          },
          {
            title: "김포·인천공항 심야 도착 — 숙소까지 안전하게 가는 법",
            kpi: "traffic",
            category: "시간대",
            categoryIcon: "🌙",
            rationale: "심야 도착 시나리오 검색 꾸준. 경쟁 약함.",
            signal: { kind: "seo-gap", detail: "심야 도착 각도 경쟁 부족" },
            difficulty: "low",
            impact: "low",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["인천공항 심야", "late arrival Seoul"],
            pillar: "living",
          },
          {
            title: "인천·김포 공항 철도·버스·택시 — 요금·소요시간 총정리",
            kpi: "traffic",
            category: "이동 방법",
            categoryIcon: "🚌",
            rationale: "교통 비교 허브. 상시 수요.",
            signal: { kind: "evergreen", detail: "공항 교통 검색 상시" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["공항 리무진", "AREX", "airport transit"],
            pillar: "living",
          },
          {
            title: "공항 환전 vs 앱 환전 — 실제 환율 비교",
            kpi: "traffic",
            category: "환전",
            categoryIcon: "💱",
            rationale: "도착 전·당일 검색. 재정 결정 실용 글.",
            signal: { kind: "evergreen", detail: "환전 검색 안정" },
            difficulty: "low",
            impact: "low",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["인천공항 환전", "won exchange app"],
            pillar: "living",
          },
        ],
      },
      {
        id: "arrive-firstdays",
        label: "첫 1~2주 버티기",
        icon: "📅",
        priority: "high",
        topics: [
          {
            title: "한국 도착 첫 주 체크리스트 — 유학생 정착 D+7",
            kpi: "dwell_time",
            category: "체크리스트",
            categoryIcon: "📋",
            rationale: "체류 전반 영향. 재방문·뉴스레터 구독 유도.",
            signal: { kind: "seo-gap", detail: "첫 주 체크리스트 경쟁 0" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["haru"],
            relatedKeywords: ["한국 첫 주", "유학생 정착", "first week Korea"],
            pillar: "living",
          },
          {
            title: "도착 당일 뭐 먹지 — 편의점·배달·슈퍼 초간단",
            kpi: "dwell_time",
            category: "음식·생존",
            categoryIcon: "🍜",
            rationale: "도착 당일 실용. 소셜 리퍼포징 최적.",
            signal: { kind: "competitor-miss", detail: "첫 끼 가이드 경쟁 0" },
            difficulty: "low",
            impact: "low",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["한국 편의점", "첫 끼", "first meal Korea"],
            pillar: "living",
          },
          {
            title: "체크인 직후 확인할 5가지 — 숙소 문제 안 생기게",
            kpi: "conversion",
            category: "체크인",
            categoryIcon: "✅",
            rationale: "체크인 만족도 → 재예약·리뷰 연결.",
            signal: { kind: "seo-gap", detail: "체크인 체크리스트 각도 경쟁 약함" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["haru"],
            relatedKeywords: ["체크인 확인", "숙소 점검"],
            pillar: "stay",
          },
          {
            title: "한국 Wi-Fi·eSIM 개통 — 공항에서 바로 vs 나중에",
            kpi: "traffic",
            category: "통신 초기 개통",
            categoryIcon: "📱",
            rationale: "eSIM 급상승. 도착 당일 결정 포인트.",
            signal: { kind: "search-rising", detail: "'Korea eSIM' +71% YoY" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["social"],
            relatedKeywords: ["Korea eSIM", "airport SIM", "외국인 유심"],
            pillar: "living",
          },
          {
            title: "한국 콘센트·전압 — 변환 어댑터 필요한가",
            kpi: "traffic",
            category: "전원",
            categoryIcon: "🔌",
            rationale: "출발 전·도착 직후 검색. 짧지만 상시 수요.",
            signal: { kind: "evergreen", detail: "'Korea plug' 상시 검색" },
            difficulty: "low",
            impact: "low",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["Korea plug", "한국 전압", "type C adapter"],
            pillar: "living",
          },
        ],
      },
    ],
  },

  // 4. 🏡 SETTLE
  {
    id: "settle",
    label: "서류·계정 세팅 중이에요",
    icon: "🏡",
    description: "ARC·은행·통신·교통카드",
    priority: "high",
    signal: { kind: "competitor-miss", detail: "정착 단계 콘텐츠 독점 기회" },
    children: [
      {
        id: "settle-arc",
        label: "외국인등록증 (ARC)",
        icon: "🪪",
        priority: "high",
        topics: [
          {
            title: "외국인등록증(ARC) 3주 완성 가이드",
            kpi: "traffic",
            category: "발급 프로세스",
            categoryIcon: "📋",
            rationale: "경쟁 약한 핵심 SEO 주제. 플라트 라이프 서비스와 직결.",
            signal: { kind: "seo-gap", detail: "ARC TOP 10 중 서비스 연결 0" },
            difficulty: "low",
            impact: "high",
            leadAgent: "search",
            supportAgents: ["stra", "haru"],
            relatedKeywords: ["ARC 발급", "외국인등록증", "거주숙소제공확인서"],
            pillar: "living",
          },
          {
            title: "거주숙소제공확인서 — 플라트 호스트가 무료 발급",
            kpi: "conversion",
            category: "증빙 서류",
            categoryIcon: "📄",
            rationale: "서비스 차별점을 SEO 콘텐츠로 변환. 전환 브리지.",
            signal: { kind: "competitor-miss", detail: "서비스 연결 콘텐츠 독점 가능" },
            difficulty: "low",
            impact: "high",
            leadAgent: "stra",
            supportAgents: ["haru"],
            relatedKeywords: ["거주숙소제공확인서", "호스트 발급", "ARC 증명"],
            pillar: "living",
          },
          {
            title: "ARC 발급 후 — 외국인등록번호 활용 가이드",
            kpi: "dwell_time",
            category: "발급 후 활용",
            categoryIcon: "🔢",
            rationale: "ARC 받은 후 다음 단계 유도. 후속 콘텐츠 체인.",
            signal: { kind: "seo-gap", detail: "후속 주제 경쟁 약함" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["stra"],
            relatedKeywords: ["외국인등록번호", "주민번호 대체"],
            pillar: "living",
          },
          {
            title: "ARC 발급 전후 — 할 수 있는 일 vs 없는 일",
            kpi: "dwell_time",
            category: "대기·단계",
            categoryIcon: "⏳",
            rationale: "ARC 대기 중 실용 정보. 신뢰 레버.",
            signal: { kind: "seo-gap", detail: "ARC 전후 비교 경쟁 부족" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["search"],
            relatedKeywords: ["ARC 대기", "before ARC"],
            pillar: "living",
          },
        ],
      },
      {
        id: "settle-bank-telco",
        label: "은행 · 통신",
        icon: "💳",
        priority: "high",
        topics: [
          {
            title: "외국인 인터넷은행 3사 비교 — 케이뱅크·토스·우리WON",
            kpi: "traffic",
            category: "은행",
            categoryIcon: "🏦",
            rationale: "ARC 다음 가장 큰 검색. 실용 가이드 상위 랭크 가능.",
            signal: { kind: "top-performer", detail: "유사 글 트래픽 상위" },
            difficulty: "low",
            impact: "high",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["외국인 은행 계좌", "케이뱅크 외국인"],
            pillar: "living",
          },
          {
            title: "외국인 통신 개통 가이드 — SKT·KT·LGU+·알뜰폰",
            kpi: "traffic",
            category: "통신",
            categoryIcon: "📱",
            rationale: "ARC 다음 단계. 외국인 요금제 비교 기회.",
            signal: { kind: "seo-gap", detail: "외국인 통신 상위 10건 중 6건 오래됨" },
            difficulty: "low",
            impact: "high",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["외국인 휴대폰", "알뜰폰 외국인"],
            pillar: "living",
          },
          {
            title: "외국인 신용카드 — 발급 가능 카드사·조건",
            kpi: "traffic",
            category: "신용카드",
            categoryIcon: "💳",
            rationale: "ARC 후 재정 정착 단계. 경쟁 약함.",
            signal: { kind: "seo-gap", detail: "외국인 신용카드 각도 경쟁 약함" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["외국인 신용카드", "credit card foreigner"],
            pillar: "living",
          },
          {
            title: "외국인 필수 앱 — 카카오·네이버·뱅킹·배달",
            kpi: "dwell_time",
            category: "필수 앱",
            categoryIcon: "📲",
            rationale: "앱 허브 콘텐츠. 내부링크 다수로 체류 상승.",
            signal: { kind: "competitor-miss", detail: "앱 허브 각도 경쟁 약함" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["Korea must-have apps", "한국 필수 앱"],
            pillar: "living",
          },
        ],
      },
      {
        id: "settle-transit",
        label: "교통카드 · 이동",
        icon: "🚌",
        priority: "medium",
        topics: [
          {
            title: "티머니·기후동행카드 완전 정복 — 외국인용",
            kpi: "traffic",
            category: "교통카드",
            categoryIcon: "🎫",
            rationale: "기후동행카드 블루오션. 2024 론칭 후 정보 부족.",
            signal: { kind: "search-rising", detail: "기후동행카드 +180%" },
            difficulty: "low",
            impact: "high",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["기후동행카드", "티머니 외국인"],
            pillar: "living",
          },
          {
            title: "외국인 운전면허 교환 가이드 — 국적별 필요 서류",
            kpi: "traffic",
            category: "면허",
            categoryIcon: "🚗",
            rationale: "주재원·장기 체류 니즈. 경쟁 약함.",
            signal: { kind: "seo-gap", detail: "운전면허 교환 상위 부족" },
            difficulty: "medium",
            impact: "low",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["외국인 운전면허", "license exchange Korea"],
            pillar: "living",
          },
          {
            title: "따릉이·킥보드 외국인 이용법 — 앱 가입 주의사항",
            kpi: "traffic",
            category: "공유모빌리티",
            categoryIcon: "🚲",
            rationale: "일상 이동 옵션. 경쟁 약함.",
            signal: { kind: "competitor-miss", detail: "외국인 공유모빌리티 가이드 부족" },
            difficulty: "low",
            impact: "low",
            leadAgent: "search",
            supportAgents: ["social"],
            relatedKeywords: ["따릉이 외국인", "Seoul bike foreigner"],
            pillar: "living",
          },
        ],
      },
    ],
  },

  // 5. 🌱 LIVE
  {
    id: "live",
    label: "일상에 적응 중이에요",
    icon: "🌱",
    description: "집안일·먹거리·건강·문화",
    priority: "medium",
    children: [
      {
        id: "live-home",
        label: "집안일 · 살림",
        icon: "🏠",
        priority: "high",
        topics: [
          {
            title: "한국식 세탁기·건조기 사용법 (버튼 번역 완전판)",
            kpi: "dwell_time",
            category: "가전",
            categoryIcon: "🧺",
            rationale: "일상 최빈도 주제. Top Performer 패턴.",
            signal: { kind: "top-performer", detail: "유사 콘텐츠 체류 340초 상위 10%" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["한국 세탁기", "건조기 사용법"],
            pillar: "living",
          },
          {
            title: "분리수거 완벽 가이드 — 외국인이 꼭 알아야 할 한국식 쓰레기",
            kpi: "dwell_time",
            category: "쓰레기",
            categoryIcon: "🗑",
            rationale: "입주 후 가장 자주 묻는 주제.",
            signal: { kind: "competitor-miss", detail: "경쟁 커버 약함" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["분리수거", "쓰레기 종량제"],
            pillar: "living",
          },
          {
            title: "아파트·오피스텔 층간소음 — 민원·매너·해결법",
            kpi: "dwell_time",
            category: "이웃 관계",
            categoryIcon: "🔊",
            rationale: "외국인 거주자 갈등 요소. 상시 수요.",
            signal: { kind: "evergreen", detail: "층간소음 검색 상시" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["stra"],
            relatedKeywords: ["층간소음", "apartment noise Korea"],
            pillar: "living",
          },
          {
            title: "여름 한국 집 관리 — 곰팡이·벌레·습기 대처",
            kpi: "dwell_time",
            category: "계절 관리",
            categoryIcon: "🌞",
            rationale: "시즌 검색. 7~8월 피크.",
            signal: { kind: "seasonal", detail: "6~8월 '곰팡이' +60%" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["Korea summer mold", "여름 곰팡이 제거"],
            pillar: "living",
          },
        ],
      },
      {
        id: "live-food",
        label: "먹거리 · 배달",
        icon: "🍱",
        priority: "medium",
        topics: [
          {
            title: "쿠팡이츠·배민 외국인용 완전 가이드 — 영어로 시키는 법",
            kpi: "dwell_time",
            category: "배달앱",
            categoryIcon: "🛵",
            rationale: "체류 초기 최빈도. 소셜 공유 활발.",
            signal: { kind: "competitor-miss", detail: "배달앱 영어 가이드 경쟁 약함" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["쿠팡이츠 영어", "배민 외국인", "food delivery Korea"],
            pillar: "living",
          },
          {
            title: "한국 마트 100% 활용법 — 이마트·홈플러스·쿠팡",
            kpi: "dwell_time",
            category: "마트",
            categoryIcon: "🛒",
            rationale: "생활 루틴 핵심. 장수 콘텐츠.",
            signal: { kind: "evergreen", detail: "마트 가이드 상시 수요" },
            difficulty: "low",
            impact: "low",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["한국 마트", "이마트 외국인"],
            pillar: "living",
          },
          {
            title: "한식 기본 메뉴 주문법 — 식당에서 무조건 성공",
            kpi: "dwell_time",
            category: "주문·메뉴",
            categoryIcon: "🥘",
            rationale: "생활 한국어·문화 결합. 소셜 리퍼포징 최적.",
            signal: { kind: "evergreen", detail: "한식 메뉴 검색 상시" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["Korean menu ordering", "한식 메뉴 영어"],
            pillar: "living",
          },
          {
            title: "혼밥 맛집·도시락·편의점 — 외국인 혼자 식사",
            kpi: "dwell_time",
            category: "혼자 식사",
            categoryIcon: "🍱",
            rationale: "혼밥 문화 소개. 유학생 일상 핵심.",
            signal: { kind: "competitor-miss", detail: "혼밥 외국인 각도 경쟁 부족" },
            difficulty: "low",
            impact: "low",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["혼밥", "Korea solo dining"],
            pillar: "living",
          },
        ],
      },
      {
        id: "live-health",
        label: "건강 · 응급",
        icon: "🏥",
        priority: "medium",
        topics: [
          {
            title: "외국인 병원 이용 가이드 — 건강보험·진료·약국",
            kpi: "traffic",
            category: "병원",
            categoryIcon: "🏥",
            rationale: "응급 검색 의도 뚜렷. 신뢰 콘텐츠.",
            signal: { kind: "seo-gap", detail: "외국인 병원 가이드 상위 부족" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["외국인 병원", "건강보험", "hospital Korea"],
            pillar: "living",
          },
          {
            title: "한국 약국 100% 활용 — 감기·두통·알레르기 약 이름",
            kpi: "traffic",
            category: "약국",
            categoryIcon: "💊",
            rationale: "일상 건강 니즈. 상시 수요.",
            signal: { kind: "evergreen", detail: "'Korea pharmacy' 상시 검색" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["Korea pharmacy", "한국 약국", "medicine Korean"],
            pillar: "living",
          },
          {
            title: "응급상황 119·112 — 영어 가능한가, 대처법",
            kpi: "traffic",
            category: "응급",
            categoryIcon: "🚨",
            rationale: "안전 정보. 신뢰·브랜드 콘텐츠.",
            signal: { kind: "seo-gap", detail: "응급 외국인 가이드 경쟁 부족" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["Korea 119", "emergency Korea English"],
            pillar: "living",
          },
        ],
      },
      {
        id: "live-culture",
        label: "문화 · 한국어",
        icon: "🎭",
        priority: "low",
        topics: [
          {
            title: "생활 한국어 100표현 — 편의점·식당·병원에서 바로",
            kpi: "dwell_time",
            category: "한국어",
            categoryIcon: "💬",
            rationale: "상시 수요. 소셜·이메일 리퍼포징 좋음.",
            signal: { kind: "evergreen", detail: "생활 한국어 월 4k+" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["social", "email"],
            relatedKeywords: ["생활 한국어", "survival Korean"],
            pillar: "living",
          },
          {
            title: "한국 직장·학교 매너 — 존댓말·회식·호칭",
            kpi: "dwell_time",
            category: "매너",
            categoryIcon: "💼",
            rationale: "문화 충격 최소화. 재방문 체인.",
            signal: { kind: "evergreen", detail: "Korean workplace 검색 안정" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["한국 회식", "Korean work culture"],
            pillar: "living",
          },
          {
            title: "한국에서 친구 사귀는 법 — 모임·앱·커뮤니티",
            kpi: "dwell_time",
            category: "관계",
            categoryIcon: "👥",
            rationale: "외로움·소속감은 장기 체류 핵심 니즈.",
            signal: { kind: "competitor-miss", detail: "외국인 친구 각도 경쟁 부족" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["make friends Korea", "한국 외국인 모임"],
            pillar: "living",
          },
        ],
      },
    ],
  },

  // 6. 🗺 EXPLORE
  {
    id: "explore",
    label: "동네·주말을 알아가고 있어요",
    icon: "🗺",
    description: "서울 동네 · 지방 여행 · 계절",
    priority: "high",
    children: [
      {
        id: "explore-seoul-n",
        label: "서울 — 성수·이태원·홍대",
        icon: "🏙",
        priority: "high",
        topics: [
          {
            title: "성수동 단기임대 완벽 가이드 — 노마드 핫플 2026",
            kpi: "conversion",
            category: "성수",
            categoryIcon: "🌳",
            rationale: "성수 검색 폭증 + 매물 수 증가.",
            signal: { kind: "search-rising", detail: "성수 단기임대 +27% MoM" },
            difficulty: "low",
            impact: "high",
            leadAgent: "search",
            supportAgents: ["stra", "haru"],
            relatedKeywords: ["성수 한달살기", "성수 원룸", "성수 노마드"],
            pillar: "local",
          },
          {
            title: "성수 카페·서울숲 산책 — 거주자의 주말 루트",
            kpi: "dwell_time",
            category: "성수",
            categoryIcon: "🌳",
            rationale: "라이프스타일 콘텐츠로 체류·재방문 증가.",
            signal: { kind: "competitor-miss", detail: "거주자 시점 경쟁 약함" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["성수 카페", "서울숲 산책"],
            pillar: "local",
          },
          {
            title: "이태원·한남 단기임대 — 외국인 커뮤니티 근처 TOP 7",
            kpi: "conversion",
            category: "이태원·한남",
            categoryIcon: "🌏",
            rationale: "외국인 유학생·주재원 직격. 경쟁 약함.",
            signal: { kind: "competitor-miss", detail: "이태원 커버 경쟁 3편 이하" },
            difficulty: "medium",
            impact: "high",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["이태원 외국인", "한남 단기임대"],
            pillar: "local",
          },
          {
            title: "홍대 단기임대 — 노마드·어학생 가이드",
            kpi: "conversion",
            category: "홍대",
            categoryIcon: "🎸",
            rationale: "어학생(D-4) 각도는 비어있음.",
            signal: { kind: "competitor-miss", detail: "어학생 각도 경쟁 0" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["search"],
            relatedKeywords: ["홍대 어학당 방", "홍대 한달살기"],
            pillar: "local",
          },
          {
            title: "익선동·북촌 — 한옥마을 근처 단기임대",
            kpi: "conversion",
            category: "익선·북촌",
            categoryIcon: "🏘",
            rationale: "감성·시즌 수요. 제휴 포텐셜.",
            signal: { kind: "seasonal", detail: "벚꽃·가을 +38%" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["social"],
            relatedKeywords: ["익선동 한옥", "북촌 숙소"],
            pillar: "local",
          },
          {
            title: "상수·합정 — 홍대 옆 조용한 거주 동네",
            kpi: "conversion",
            category: "상수·합정",
            categoryIcon: "🌉",
            rationale: "홍대는 시끄럽다는 사용자 니즈 대응.",
            signal: { kind: "evergreen", detail: "상수 합정 안정 검색" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["상수 원룸", "합정 한달살기"],
            pillar: "local",
          },
        ],
      },
      {
        id: "explore-seoul-s",
        label: "서울 — 강남·서초·마포",
        icon: "🏢",
        priority: "medium",
        topics: [
          {
            title: "강남 출장자 숙소 베스트 — 판교·여의도 포함",
            kpi: "conversion",
            category: "강남·판교",
            categoryIcon: "🏢",
            rationale: "법인·출장자 고단가 세그먼트.",
            signal: { kind: "seo-gap", detail: "강남 오피스텔 상위 플라트 0" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra", "pulse"],
            relatedKeywords: ["강남 출장 숙소", "판교 단기임대"],
            pillar: "local",
          },
          {
            title: "서초·반포 레지던스형 단기임대 — 주재원 수요",
            kpi: "conversion",
            category: "서초·반포",
            categoryIcon: "🏛",
            rationale: "프리미엄 매물 존재 + 콘텐츠 부재.",
            signal: { kind: "seo-gap", detail: "서초 레지던스 커버리지 0" },
            difficulty: "high",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["pulse"],
            relatedKeywords: ["서초 레지던스", "주재원"],
            pillar: "local",
          },
          {
            title: "마포·공덕 단기임대 — 직장인·커플 타겟",
            kpi: "traffic",
            category: "마포·공덕",
            categoryIcon: "🌉",
            rationale: "커플·둘이 살기 각도 경쟁 부족.",
            signal: { kind: "competitor-miss", detail: "커플 경쟁 약함" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["마포 한달살기", "공덕 투룸"],
            pillar: "local",
          },
          {
            title: "잠실·송파 단기임대 — 가족·장기 체류용",
            kpi: "conversion",
            category: "잠실·송파",
            categoryIcon: "🎡",
            rationale: "가족 단위·롯데월드 근처. 주재원 가족 타겟.",
            signal: { kind: "seo-gap", detail: "잠실 가족 각도 경쟁 부족" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["search"],
            relatedKeywords: ["잠실 단기임대", "송파 투룸"],
            pillar: "local",
          },
          {
            title: "방배·사당 — 강남 옆 가성비 동네",
            kpi: "traffic",
            category: "방배·사당",
            categoryIcon: "💡",
            rationale: "강남 대체 가성비 각도. 중가 세그먼트.",
            signal: { kind: "competitor-miss", detail: "방배·사당 각도 경쟁 부족" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["방배동 단기임대", "사당역 원룸"],
            pillar: "local",
          },
        ],
      },
      {
        id: "explore-campus",
        label: "캠퍼스 주변",
        icon: "🎓",
        priority: "high",
        topics: [
          {
            title: "서울대 유학생 주거 — 봉천동 vs 신림동 동네 비교",
            kpi: "traffic",
            category: "서울대",
            categoryIcon: "🏛",
            rationale: "세부 동네 비교는 검색 니즈 확실. 2열 비교 유리.",
            signal: { kind: "seo-gap", detail: "동네 비교 콘텐츠 경쟁 약함" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["봉천동", "신림동", "관악 원룸", "서울대 근처"],
            pillar: "local",
          },
          {
            title: "연세대·이대 유학생 추천 방 — 신촌 시세 비교",
            kpi: "conversion",
            category: "연세·이대",
            categoryIcon: "🦅",
            rationale: "2개 대학 묶어서 커버. 효율 2배.",
            signal: { kind: "top-performer", detail: "연대 글 전환 상위 15%" },
            difficulty: "low",
            impact: "high",
            leadAgent: "stra",
            supportAgents: ["search"],
            relatedKeywords: ["연세대 근처", "이대 유학생", "신촌 방"],
            pillar: "local",
          },
          {
            title: "건국대 외국인 유학생 방 추천 — 화양동 핫스팟",
            kpi: "conversion",
            category: "건국대",
            categoryIcon: "🐻",
            rationale: "외국인 유학생 밀집 지역. 플라트 매물 직결.",
            signal: { kind: "seo-gap", detail: "건대 전환 키워드 5위 이하" },
            difficulty: "low",
            impact: "high",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["건국대 유학생", "화양동 방"],
            pillar: "local",
          },
          {
            title: "고려대 주거 가이드 — 안암·제기동 시세 매핑",
            kpi: "traffic",
            category: "고려대",
            categoryIcon: "🐯",
            rationale: "고려대 키워드 검색 안정. SEO 갭 명확.",
            signal: { kind: "seo-gap", detail: "고대 유학생 상위 10 중 플라트 2" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["고려대 근처", "안암동 원룸"],
            pillar: "local",
          },
          {
            title: "한양대 왕십리 — 유학생 자취 완벽 가이드",
            kpi: "conversion",
            category: "한양대",
            categoryIcon: "💪",
            rationale: "왕십리 상권 + 역세권. 경쟁 약함.",
            signal: { kind: "seo-gap", detail: "한양대 주거 가이드 부족" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["search"],
            relatedKeywords: ["한양대 자취", "왕십리 원룸"],
            pillar: "local",
          },
          {
            title: "성균관대 혜화·종로 — 자취 시세 매핑",
            kpi: "traffic",
            category: "성균관대",
            categoryIcon: "🎓",
            rationale: "성대 인문사회 캠퍼스 근처. 시세 투명화.",
            signal: { kind: "seo-gap", detail: "성대 시세 가이드 경쟁 약함" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["stra"],
            relatedKeywords: ["성균관대 자취", "혜화 원룸"],
            pillar: "local",
          },
        ],
      },
      {
        id: "explore-region",
        label: "지방 — 부산·제주·강원",
        icon: "🌊",
        priority: "medium",
        topics: [
          {
            title: "부산 해운대·서면 단기임대 — 지방 한달살기 TOP",
            kpi: "conversion",
            category: "부산",
            categoryIcon: "🌊",
            rationale: "부산 한달살기 급증.",
            signal: { kind: "search-rising", detail: "부산 한달살기 +52% YoY" },
            difficulty: "medium",
            impact: "high",
            leadAgent: "stra",
            supportAgents: ["search"],
            relatedKeywords: ["부산 한달살기", "해운대 단기임대"],
            pillar: "local",
          },
          {
            title: "제주 한달살기 — 봄 시즌 워케이션 매물 가이드",
            kpi: "conversion",
            category: "제주",
            categoryIcon: "🍊",
            rationale: "4~5월 시즌. 플라트 제주 매물 증가.",
            signal: { kind: "seasonal", detail: "4~5월 +45%" },
            difficulty: "low",
            impact: "high",
            leadAgent: "stra",
            supportAgents: ["search", "social"],
            relatedKeywords: ["제주 한달살기", "제주 워케이션"],
            pillar: "local",
          },
          {
            title: "경주 한달살기 — 역사 도시 워케이션 루트",
            kpi: "conversion",
            category: "경주",
            categoryIcon: "🏛",
            rationale: "경주 감성·한옥 수요. 시즌 피크.",
            signal: { kind: "seasonal", detail: "가을 단풍 시즌 +30%" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["social"],
            relatedKeywords: ["경주 한달살기", "Gyeongju stay"],
            pillar: "local",
          },
          {
            title: "강릉·속초 — 동해 바다 한달살기",
            kpi: "conversion",
            category: "강원",
            categoryIcon: "🏖",
            rationale: "KTX·ITX 접근성. 여름·겨울 양대 시즌.",
            signal: { kind: "seasonal", detail: "여름 피크 +52%" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["search"],
            relatedKeywords: ["강릉 한달살기", "속초 단기임대"],
            pillar: "local",
          },
        ],
      },
      {
        id: "explore-season",
        label: "계절·시즌",
        icon: "🌸",
        priority: "medium",
        topics: [
          {
            title: "계절별 한달살기 — 벚꽃·단풍·눈 시즌 최적 매물",
            kpi: "traffic",
            category: "시즌별 매물",
            categoryIcon: "🍁",
            rationale: "시즌 키워드 매년 피크 + 업데이트로 장수 SEO.",
            signal: { kind: "seasonal", detail: "계절 키워드 피크" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["social"],
            relatedKeywords: ["벚꽃 한달살기", "단풍 한달살기"],
            pillar: "local",
          },
          {
            title: "서울 워케이션 베스트 10 동네 — 노마드 추천",
            kpi: "dwell_time",
            category: "워케이션",
            categoryIcon: "💻",
            rationale: "노마드 커뮤니티 공유 활발. 소셜 리퍼포징 최적.",
            signal: { kind: "search-rising", detail: "서울 워케이션 +31% MoM" },
            difficulty: "medium",
            impact: "high",
            leadAgent: "stra",
            supportAgents: ["social", "haru"],
            relatedKeywords: ["서울 워케이션", "노마드 한달"],
            pillar: "local",
          },
          {
            title: "여름 더위 피하는 서울 동네 — 에어컨·공원 접근",
            kpi: "traffic",
            category: "여름",
            categoryIcon: "☀️",
            rationale: "7~8월 시즌 검색 피크. 매년 업데이트.",
            signal: { kind: "seasonal", detail: "7~8월 'Seoul summer' 피크" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["social"],
            relatedKeywords: ["서울 여름", "cool Seoul neighborhood"],
            pillar: "local",
          },
          {
            title: "겨울 눈 시즌 — 한달살기 베스트 지역",
            kpi: "traffic",
            category: "겨울",
            categoryIcon: "❄️",
            rationale: "겨울 여행 수요 꾸준. 스키·설경 결합.",
            signal: { kind: "seasonal", detail: "12~2월 'Korea winter' 피크" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "stra",
            supportAgents: ["social"],
            relatedKeywords: ["겨울 한달살기", "Korea winter stay"],
            pillar: "local",
          },
        ],
      },
    ],
  },

  // 7. 🔄 CHANGE
  {
    id: "change",
    label: "상황이 바뀌었어요",
    icon: "🔄",
    description: "연장·이사·귀국",
    priority: "medium",
    children: [
      {
        id: "change-visa",
        label: "비자 · 체류 연장",
        icon: "📆",
        priority: "medium",
        topics: [
          {
            title: "D-2 비자 연장 가이드 — 준비물·신청·주의사항",
            kpi: "traffic",
            category: "D-2 연장",
            categoryIcon: "🔄",
            rationale: "체류 중 사용자 타겟. 재방문 유도.",
            signal: { kind: "seo-gap", detail: "비자 연장 세부 가이드 적음" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["D-2 연장", "유학 비자 연장"],
            pillar: "living",
          },
          {
            title: "체류지 변경 신고 — 이사 후 14일 이내 필수",
            kpi: "dwell_time",
            category: "체류지 변경",
            categoryIcon: "🏠",
            rationale: "플라트 재예약 유도 브리지 주제.",
            signal: { kind: "competitor-miss", detail: "체류지 변경 경쟁 약함" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["stra"],
            relatedKeywords: ["체류지 변경", "이사 신고"],
            pillar: "living",
          },
          {
            title: "D-2 → D-10 구직 비자 전환 가이드",
            kpi: "traffic",
            category: "D-10 전환",
            categoryIcon: "🧑‍💼",
            rationale: "졸업 후 체류 연장 핵심. 경쟁 약함.",
            signal: { kind: "seo-gap", detail: "D-10 전환 가이드 상위 부족" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["D-10 비자", "job seeker visa Korea"],
            pillar: "living",
          },
        ],
      },
      {
        id: "change-move",
        label: "이사 · 재계약",
        icon: "🚚",
        priority: "high",
        topics: [
          {
            title: "이사 과도기 3주~2개월 단기임대 — 짐 보관·계약 팁",
            kpi: "conversion",
            category: "과도기",
            categoryIcon: "🚚",
            rationale: "내국인 신규 세그먼트. 직방·다방 반대편 포지셔닝.",
            signal: { kind: "competitor-miss", detail: "이사 과도기 전용 경쟁 약함" },
            difficulty: "medium",
            impact: "high",
            leadAgent: "stra",
            supportAgents: ["search", "haru"],
            relatedKeywords: ["이사 과도기", "단기 거주"],
            pillar: "stay",
          },
          {
            title: "타지 발령 3개월 숙소 — 출장 vs 단기임대 비용 비교",
            kpi: "conversion",
            category: "발령 숙소",
            categoryIcon: "🏢",
            rationale: "기업 발령자 타겟. 법인 결제 가능.",
            signal: { kind: "seo-gap", detail: "발령자 숙소 비교 블루오션" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["pulse"],
            relatedKeywords: ["발령 숙소", "프로젝트 파견"],
            pillar: "stay",
          },
          {
            title: "한국 내 이사 체크리스트 — 외국인용",
            kpi: "dwell_time",
            category: "이사 실행",
            categoryIcon: "📋",
            rationale: "체류 중 이사 니즈. 재계약·매물 재탐색.",
            signal: { kind: "seo-gap", detail: "외국인 이사 가이드 상위 부족" },
            difficulty: "low",
            impact: "medium",
            leadAgent: "haru",
            supportAgents: ["stra"],
            relatedKeywords: ["이사 체크리스트", "move apartment Korea"],
            pillar: "living",
          },
          {
            title: "전세·월세 계약 해지 — 보증금 돌려받는 법",
            kpi: "traffic",
            category: "계약 해지",
            categoryIcon: "💰",
            rationale: "불만·불안 검색. 신뢰 콘텐츠.",
            signal: { kind: "competitor-miss", detail: "외국인 계약 해지 경쟁 약함" },
            difficulty: "medium",
            impact: "medium",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["보증금 반환", "lease termination Korea"],
            pillar: "living",
          },
        ],
      },
      {
        id: "change-return",
        label: "귀국 · 정리",
        icon: "🛬",
        priority: "low",
        topics: [
          {
            title: "귀국 전 체크리스트 — 계약 해지·세금·짐 보내기",
            kpi: "dwell_time",
            category: "체크리스트",
            categoryIcon: "📋",
            rationale: "체류 마무리 타겟. 브랜드 신뢰·재방문 여지.",
            signal: { kind: "seo-gap", detail: "귀국 정리 가이드 경쟁 거의 0" },
            difficulty: "medium",
            impact: "low",
            leadAgent: "haru",
            supportAgents: ["stra"],
            relatedKeywords: ["귀국 준비", "한국 떠나기", "leaving Korea"],
            pillar: "living",
          },
          {
            title: "귀국 후에도 한국 친구·네트워크 유지 팁",
            kpi: "dwell_time",
            category: "네트워크",
            categoryIcon: "🔗",
            rationale: "브랜드 감성 콘텐츠. 재방문 예약 유도.",
            signal: { kind: "evergreen", detail: "alumni 검색 꾸준" },
            difficulty: "low",
            impact: "low",
            leadAgent: "haru",
            supportAgents: ["social"],
            relatedKeywords: ["Korea alumni", "한국 네트워크 유지"],
            pillar: "living",
          },
          {
            title: "짐 항공 배송 vs 해외 배송 — 비용·기간 비교",
            kpi: "traffic",
            category: "배송",
            categoryIcon: "📦",
            rationale: "실용 비교 허브. 경쟁 약함.",
            signal: { kind: "seo-gap", detail: "귀국 배송 비교 경쟁 부족" },
            difficulty: "low",
            impact: "low",
            leadAgent: "search",
            supportAgents: ["haru"],
            relatedKeywords: ["해외 배송", "international shipping Korea"],
            pillar: "living",
          },
        ],
      },
    ],
  },
]

export function findNode(path: string[]): FunnelNode | null {
  let nodes: FunnelNode[] = FUNNEL_TREE
  let target: FunnelNode | null = null
  for (const id of path) {
    const next = nodes.find((n) => n.id === id)
    if (!next) return null
    target = next
    nodes = next.children ?? []
  }
  return target
}

// ════════════════════════════════════════════════════
// COVERAGE STATS
// ════════════════════════════════════════════════════

export function collectTopics(node: FunnelNode): Topic[] {
  const out: Topic[] = []
  const walk = (n: FunnelNode) => {
    if (n.topics) out.push(...n.topics)
    if (n.children) n.children.forEach(walk)
  }
  walk(node)
  return out
}

export interface CategoryStats {
  key: string
  label: string
  icon: string
  topicCount: number
  opportunityCount: number
  byPillar: Record<Pillar, number>
  byKPI: Record<TargetKPI, number>
  highImpactCount: number
  topics: Topic[]
}

export function categorizeTopics(topics: Topic[]): CategoryStats[] {
  const groups = new Map<string, Topic[]>()
  topics.forEach((t) => {
    const arr = groups.get(t.category) ?? []
    arr.push(t)
    groups.set(t.category, arr)
  })
  return Array.from(groups.entries()).map(([label, list]) => {
    const byPillar: Record<Pillar, number> = { stay: 0, living: 0, local: 0 }
    const byKPI: Record<TargetKPI, number> = { conversion: 0, traffic: 0, dwell_time: 0 }
    let opportunityCount = 0
    let highImpactCount = 0
    list.forEach((t) => {
      byPillar[t.pillar]++
      byKPI[t.kpi]++
      if (t.signal.kind === "seo-gap" || t.signal.kind === "competitor-miss") opportunityCount++
      if (t.impact === "high") highImpactCount++
    })
    return {
      key: label.toLowerCase().replace(/[^\w가-힣]+/g, "-"),
      label,
      icon: list[0].categoryIcon,
      topicCount: list.length,
      opportunityCount,
      byPillar,
      byKPI,
      highImpactCount,
      topics: list,
    }
  })
}

export interface SubBranchStats {
  id: string
  label: string
  icon?: string
  topicCount: number
  highImpactCount: number
  opportunityCount: number
  categories: CategoryStats[]
  topics: Topic[]
  byPillar: Record<Pillar, number>
  byKPI: Record<TargetKPI, number>
}

export interface StageStats {
  id: string
  label: string
  icon?: string
  topicCount: number
  byPillar: Record<Pillar, number>
  byKPI: Record<TargetKPI, number>
  byImpact: Record<"high" | "medium" | "low", number>
  opportunityCount: number
  risingCount: number
  seasonalCount: number
  subBranches: SubBranchStats[]
  topics: Topic[]
}

export interface JourneyStats {
  totalTopics: number
  byPillar: Record<Pillar, number>
  byKPI: Record<TargetKPI, number>
  byImpact: Record<"high" | "medium" | "low", number>
  opportunityCount: number
  stages: StageStats[]
  deficitStageIds: string[]
}

export const DEFICIT_THRESHOLD: Record<string, number> = {
  consider: 12,
  prepare: 16,
  arrive: 8,
  settle: 10,
  live: 14,
  explore: 22,
  change: 10,
}

export function computeStageStats(stage: FunnelNode): StageStats {
  const topics = collectTopics(stage)
  const byPillar: Record<Pillar, number> = { stay: 0, living: 0, local: 0 }
  const byKPI: Record<TargetKPI, number> = { conversion: 0, traffic: 0, dwell_time: 0 }
  const byImpact: Record<"high" | "medium" | "low", number> = { high: 0, medium: 0, low: 0 }
  let opportunityCount = 0
  let risingCount = 0
  let seasonalCount = 0
  topics.forEach((t) => {
    byPillar[t.pillar]++
    byKPI[t.kpi]++
    byImpact[t.impact]++
    if (t.signal.kind === "seo-gap" || t.signal.kind === "competitor-miss") opportunityCount++
    if (t.signal.kind === "search-rising") risingCount++
    if (t.signal.kind === "seasonal") seasonalCount++
  })
  const subBranches: SubBranchStats[] = (stage.children ?? []).map((child) => {
    const childTopics = collectTopics(child)
    const subByPillar: Record<Pillar, number> = { stay: 0, living: 0, local: 0 }
    const subByKPI: Record<TargetKPI, number> = {
      conversion: 0,
      traffic: 0,
      dwell_time: 0,
    }
    childTopics.forEach((t) => {
      subByPillar[t.pillar]++
      subByKPI[t.kpi]++
    })
    return {
      id: child.id,
      label: child.label,
      icon: child.icon,
      topicCount: childTopics.length,
      highImpactCount: childTopics.filter((t) => t.impact === "high").length,
      opportunityCount: childTopics.filter(
        (t) => t.signal.kind === "seo-gap" || t.signal.kind === "competitor-miss"
      ).length,
      categories: categorizeTopics(childTopics),
      topics: childTopics,
      byPillar: subByPillar,
      byKPI: subByKPI,
    }
  })
  return {
    id: stage.id,
    label: stage.label,
    icon: stage.icon,
    topicCount: topics.length,
    byPillar,
    byKPI,
    byImpact,
    opportunityCount,
    risingCount,
    seasonalCount,
    subBranches,
    topics,
  }
}

export function computeJourneyStats(): JourneyStats {
  const stages = FUNNEL_TREE.map(computeStageStats)
  const byPillar: Record<Pillar, number> = { stay: 0, living: 0, local: 0 }
  const byKPI: Record<TargetKPI, number> = { conversion: 0, traffic: 0, dwell_time: 0 }
  const byImpact: Record<"high" | "medium" | "low", number> = { high: 0, medium: 0, low: 0 }
  let opportunityCount = 0
  let totalTopics = 0
  stages.forEach((s) => {
    totalTopics += s.topicCount
    ;(Object.keys(s.byPillar) as Pillar[]).forEach((k) => (byPillar[k] += s.byPillar[k]))
    ;(Object.keys(s.byKPI) as TargetKPI[]).forEach((k) => (byKPI[k] += s.byKPI[k]))
    ;(Object.keys(s.byImpact) as Array<"high" | "medium" | "low">).forEach(
      (k) => (byImpact[k] += s.byImpact[k])
    )
    opportunityCount += s.opportunityCount
  })
  const deficitStageIds = stages
    .filter((s) => s.topicCount < (DEFICIT_THRESHOLD[s.id] ?? 8))
    .map((s) => s.id)
  return {
    totalTopics,
    byPillar,
    byKPI,
    byImpact,
    opportunityCount,
    stages,
    deficitStageIds,
  }
}

export function isStageDeficit(stage: StageStats): boolean {
  return stage.topicCount < (DEFICIT_THRESHOLD[stage.id] ?? 8)
}

export function deficitDelta(stage: StageStats): number {
  const target = DEFICIT_THRESHOLD[stage.id] ?? 8
  return Math.max(0, target - stage.topicCount)
}
