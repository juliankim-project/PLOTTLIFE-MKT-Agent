/**
 * Agent Runner — 블로그 파이프라인의 각 단계에서 AI 에이전트가 제공할 응답 mock.
 * Phase 1: 하드코딩된 시그니처 응답. Phase 2에서 실제 Claude API 호출로 교체.
 *
 * 각 에이전트(SPECIALISTS)의 skillSlug에 맞는 함수를 export.
 */

import type { BlogContent, TargetKPI } from "./schema"

// ── 서치 (seo-audit) — 키워드·경쟁 갭 분석 ─────────────────

export interface SeoInsight {
  primaryKeyword: string
  searchVolume: "low" | "medium" | "high"
  difficulty: "low" | "medium" | "high"
  competitorsCovering: string[]
  gapOpportunity: string
  relatedLongtail: string[]
  onPageSuggestions: string[]
}

export function runSeoAudit(keyword: string, kpi: TargetKPI): SeoInsight {
  const samples: Record<string, SeoInsight> = {
    default: {
      primaryKeyword: keyword,
      searchVolume: "medium",
      difficulty: "medium",
      competitorsCovering: ["엔코스테이", "미스터멘션"],
      gapOpportunity: `"${keyword}"는 경쟁사들이 표면적으로만 커버. ARC·생활 정보와 결합하면 독점 가능.`,
      relatedLongtail: [
        `${keyword} 보증금 없는`,
        `${keyword} 외국인 유학생`,
        `${keyword} 즉시 입주`,
        `${keyword} 월세 시세`,
      ],
      onPageSuggestions: [
        "H1에 주요 키워드 포함 + 부제에 세컨더리 키워드 자연스럽게",
        "FAQ 스키마 마크업 (보증금·환불·계약 기간 Q&A)",
        "이미지 alt에 지역·매물 타입 반영",
        "내부링크 3개 이상 — 같은 지역 다른 글·방 상세 페이지",
      ],
    },
  }
  return { ...samples.default, primaryKeyword: keyword }
}

// ── 스트래 (content-strategy) — 필러·캘린더 제안 ─────────────────

export interface StrategyBrief {
  pillarFit: "STAY GUIDE" | "LIVING" | "LOCAL"
  targetKPI: TargetKPI
  targetAudience: string
  positioning: string
  contentAngles: string[]
  optimalPublishWindow: string
  relatedSeries: string[]
}

export function runStrategyBrief(keyword: string, kpi: TargetKPI): StrategyBrief {
  const pillarMap: Record<TargetKPI, "STAY GUIDE" | "LIVING" | "LOCAL"> = {
    conversion: "STAY GUIDE",
    traffic: "LIVING",
    dwell_time: "LOCAL",
  }
  return {
    pillarFit: pillarMap[kpi],
    targetKPI: kpi,
    targetAudience: "외국인 유학생 · 디지털 노마드",
    positioning: `"${keyword}"는 ${pillarMap[kpi]} 필러의 핵심 주제. 경쟁사 대비 생활 정보·후기 결합이 차별점.`,
    contentAngles: [
      "매물 중심 추천 리스트 (TOP 10)",
      "1인칭 거주 경험담 (30일 일기)",
      "체크리스트·가이드 (FAQ 포함)",
      "비교 콘텐츠 (vs 기숙사·에어비앤비)",
    ],
    optimalPublishWindow: "화·목 오전 9시 (신규 매물 알림과 동기화)",
    relatedSeries: [
      "같은 지역 스토리 시리즈로 연결",
      "대학 근처면 학교별 가이드 허브와 링크",
    ],
  }
}

// ── 심리 (marketing-psychology) — CTA·심리 레버 제안 ─────────────────

export interface PsychologyLevers {
  detectedBiases: string[]
  ctaVariants: { label: string; rationale: string }[]
  socialProofSuggestions: string[]
  scarcityCue: string
  anxietyAddressed: string[]
}

export function runPsychology(content: BlogContent): PsychologyLevers {
  return {
    detectedBiases: [
      "손실회피: 보증금 없는 옵션은 '잃을 게 없음'을 강조",
      "사회적 증거: '유학생 28만명이 선택하는' 수치 삽입",
      "권위: '플라트 인증 매물' 배지 반복 노출",
      "희소성: '이번 주 남은 매물 X개' (사실 기반만)",
    ],
    ctaVariants: [
      { label: "이 방 둘러보기 →", rationale: "탐색 유도 · 저부담" },
      { label: "카톡으로 간단 문의", rationale: "친근 · 응답 기대치 낮춤" },
      { label: "10초면 예약 완료", rationale: "시간 앵커링" },
    ],
    socialProofSuggestions: [
      "글 중간에 실제 게스트 리뷰 1줄 인용",
      "푸터 직전 '이번 달 N명이 문의' 수치",
    ],
    scarcityCue: "'봄 학기 전 2개월' 같은 시간 기반 (재고 기반은 사기 위험)",
    anxietyAddressed: [
      "'환불 정책' 섹션 눈에 띄게",
      "'영상 투어 가능' 명시로 '사진과 다르면?' 불안 해소",
      "호스트 응답 시간 지표 (평균 3분)",
    ],
  }
}

// ── 하루 (copywriting) — 헤드라인·본문 카피 제안 ─────────────────

export interface CopyVariants {
  headlines: string[]
  leadParagraph: string
  sectionHooks: string[]
  closingCta: string
}

export function runCopywriting(content: BlogContent): CopyVariants {
  const k = content.primary_keyword
  return {
    headlines: [
      `${k} 완벽 가이드 — 2026 최신 업데이트`,
      `${k}, 이 글 하나로 정리했어요`,
      `${k} 찾고 계신가요? 지금 필요한 모든 것`,
      `외국인도 쉽게 — ${k} 체크리스트`,
      `${k} — 유학생·노마드가 뽑은 추천`,
    ],
    leadParagraph: `한국에서 ${content.target_audience}으(로) ${k}을(를) 찾고 계신가요? 플라트 라이프가 직접 검증한 매물 중에서 이번 주 예약 가능한 곳만 골라서 정리했습니다. 사진·가격·호스트 응답 속도까지 한눈에 확인하세요.`,
    sectionHooks: [
      "먼저 알아두면 좋은 것",
      "실제 매물은 어떤가요?",
      "계약 전 체크리스트",
      "자주 묻는 질문",
      "지금 문의하는 법",
    ],
    closingCta:
      "마음에 드는 방 찾으셨나요? 아래 카톡으로 문의하시면 3분 안에 답변드려요. 한국어·영어·중국어·베트남어 상담 가능합니다.",
  }
}

// ── 소셜 (social-content) — 플랫폼별 리퍼포징 ─────────────────

export interface SocialRepurposingPack {
  platform: "instagram" | "threads" | "youtube-shorts" | "x" | "linkedin"
  format: string
  hook: string
  caption: string
  hashtags: string[]
  cta: string
}

export function runSocialRepurposing(content: BlogContent): SocialRepurposingPack[] {
  const k = content.primary_keyword
  return [
    {
      platform: "instagram",
      format: "캐러셀 8장",
      hook: `${k} 찾는 분 저장 필수`,
      caption: `${content.title}\n\n저희가 직접 검증한 매물만 모아봤어요. 자세한 내용은 프로필 링크로 → 블로그에서.`,
      hashtags: ["#단기임대", "#한달살기", "#유학생", "#서울", "#플라트라이프"],
      cta: "프로필 링크로 블로그 전문 읽기",
    },
    {
      platform: "threads",
      format: "스레드 시리즈 5편",
      hook: `${k}에 대한 팩트 5가지를 정리했습니다.`,
      caption: "1편: 시세 범위\n2편: 추천 지역\n3편: 흔한 실수\n4편: 계약 팁\n5편: 마무리",
      hashtags: ["#단기임대", "#한달살기"],
      cta: "전체 내용은 블로그 참고",
    },
    {
      platform: "youtube-shorts",
      format: "60초 쇼츠",
      hook: `${k}이 궁금하세요? 60초 요약.`,
      caption: `${content.title}의 핵심 3가지를 60초로.`,
      hashtags: ["#Shorts", "#단기임대", "#한국생활"],
      cta: "자세한 내용은 설명란 블로그 링크",
    },
  ]
}

// ── 케어 (email-sequence) — 발행 후 뉴스레터·시퀀스 ─────────────────

export interface NewsletterPlan {
  subject: string
  preheader: string
  segmentTarget: string
  cadence: string
  body: string
  cta: string
}

export function runEmailSequence(content: BlogContent): NewsletterPlan {
  return {
    subject: `📬 ${content.title}`,
    preheader: "이번 주 새로 올라온 가이드와 매물 소식을 전해드려요",
    segmentTarget: `${content.target_audience} · 관심 태그: ${content.primary_keyword}`,
    cadence: "발행 후 24시간 내 1차 발송 · 7일 후 미클릭 대상 리마인드",
    body: `${content.target_audience}님, 이번 주는 "${content.primary_keyword}"에 대한 완벽 가이드를 준비했어요. 매물 3곳과 함께 계약 체크리스트까지 한 번에 정리했습니다. 5분이면 충분해요.`,
    cta: "가이드 읽으러 가기",
  }
}

// ── 퍼포 (paid-ads) — 광고·트래킹 제안 ─────────────────

export interface PerfInsight {
  recommendedChannels: { channel: string; rationale: string; estRoas: string }[]
  trackingEvents: string[]
  budgetSuggestion: string
  forecastNote: string
}

export function runPerformance(content: BlogContent): PerfInsight {
  return {
    recommendedChannels: [
      { channel: "Google Search Ads", rationale: "고의도 키워드 매칭", estRoas: "3.5x" },
      { channel: "Meta 리타겟팅", rationale: "블로그 방문자 리마케팅", estRoas: "5.2x" },
      { channel: "네이버 파워링크", rationale: "내국인 단기임대 타겟", estRoas: "2.8x" },
    ],
    trackingEvents: [
      "blog_post_read_50_pct",
      "listing_card_click",
      "contact_kakao_click",
      "newsletter_signup",
    ],
    budgetSuggestion: "테스트: 주당 30만원 (채널별 10만원) · 7일 후 성과 기반 재배분",
    forecastNote: "예상 CPC 450~700원 · CTR 2.8% 기준 월간 세션 +2.4k",
  }
}

// ── 픽셀 (ad-creative) — 광고 비주얼 제안 ─────────────────

export interface CreativeBrief {
  visualConcept: string
  assetList: string[]
  copyPairing: string
  brandColors: string[]
}

export function runCreativeBrief(content: BlogContent): CreativeBrief {
  return {
    visualConcept: "웜톤 · 플라트 갈색(#74594B) 베이스 + 자연광 사진 · 한국인/외국인 게스트 뒷모습 중심",
    assetList: [
      "정방형 1:1 (Meta 피드) — 매물 외관 + 가격 오버레이",
      "세로 9:16 (Stories·Reels) — 30초 방 투어",
      "가로 16:9 (YouTube Pre-roll) — 15초 핵심 가치 전달",
      "배너 (Google Display) — 정적 이미지 + CTA",
    ],
    copyPairing: "하루가 쓴 헤드라인 중 3~5단어 짧은 카피 선택",
    brandColors: ["#74594B (primary)", "#f5f0e5 (accent bg)", "#3d2b1f (dark accent)"],
  }
}
