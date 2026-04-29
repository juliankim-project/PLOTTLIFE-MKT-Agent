/**
 * Category — 우리 drafts/topic 정보를 대브 어드민의 5개 카테고리에 자동 매핑.
 *
 * 대브 카테고리 (apps/admin/.../julian/blog/schemas.ts 참고):
 *   "입주 가이드" · "동네 추천" · "생활 팁" · "입주 후기" · "맛집"
 *
 * 매핑 우선순위:
 *  1) 키워드 패턴 (primary_keyword + secondary_keywords + title)
 *  2) journey_stage 추정
 *  3) 디폴트 = "입주 가이드" (단기임대 도메인 가장 흔한 카테고리)
 */

export const DAB_CATEGORIES = [
  "입주 가이드",
  "동네 추천",
  "생활 팁",
  "입주 후기",
  "맛집",
] as const
export type DabCategory = (typeof DAB_CATEGORIES)[number]

interface CategorySignals {
  title?: string | null
  primaryKeyword?: string | null
  secondaryKeywords?: string[] | null
  journeyStage?: string | null
}

/* ─── 규칙 1: 키워드 패턴 → 카테고리 ──────────────────────────
   각 카테고리당 한국어/영어/이모지 등 후보 키워드.
   먼저 매칭되는 카테고리를 선택. 우선순위는 위에서 아래로. */
const KEYWORD_RULES: Array<{ category: DabCategory; patterns: RegExp[] }> = [
  {
    category: "맛집",
    patterns: [
      /맛집/, /먹거리/, /카페/, /\b음식\b/, /식당/, /디저트/, /브런치/,
      /\brestaurant/i, /\bcafe/i,
    ],
  },
  {
    category: "동네 추천",
    patterns: [
      /동네/, /지역/, /근처/, /주변/, /역세권/, /캠퍼스/,
      /[가-힣]+동\b/, // "신촌동", "이태원동"
      /[가-힣]+구\b/, // "강남구", "마포구"
      /\bneighborhood/i, /\bnear\b/i,
    ],
  },
  {
    category: "입주 후기",
    patterns: [
      /후기/, /체류기/, /살아본/, /살아보니/, /경험담/, /경험기/, /인터뷰/,
      /\breview/i, /\bexperience/i, /\bstory/i,
    ],
  },
  {
    category: "생활 팁",
    patterns: [
      /\b팁\b/, /꿀팁/, /\bQ&A\b/i, /\bFAQ\b/i, /노하우/, /방법/, /어떻게/, /가능할까/,
      /일상/, /라이프/, /생활/,
      /\btip/i, /\bhowto\b/i, /\bhow to\b/i,
    ],
  },
  /* "입주 가이드" 는 디폴트라 키워드 매칭 마지막에. 명시 키워드는 보강용. */
  {
    category: "입주 가이드",
    patterns: [
      /가이드/, /입주/, /계약/, /보증금/, /\bARC\b/i, /외국인등록/, /비자/, /\bvisa\b/i,
      /체크리스트/, /절차/, /신청/, /발급/, /필요서류/,
      /\bguide\b/i, /\bchecklist\b/i,
    ],
  },
]

/* ─── 규칙 2: journey_stage → 카테고리 ─────────────────────── */
const STAGE_FALLBACK: Record<string, DabCategory> = {
  /* compass.ts 의 JOURNEY_STAGES — 떠나기전·도착·정착·탐방·마무리·변화·발견·고려 */
  before:    "입주 가이드", // 떠나기전
  arrive:    "입주 가이드", // 도착
  prepare:   "입주 가이드", // 준비
  consider:  "입주 가이드", // 고려
  discover:  "동네 추천",   // 발견
  settle:    "생활 팁",     // 정착
  explore:   "동네 추천",   // 탐방
  wrapup:    "입주 후기",   // 마무리
  transform: "입주 후기",   // 변화
}

/** drafts/topic 정보로부터 카테고리 자동 결정. 항상 1개 반환. */
export function pickDabCategory(s: CategorySignals): DabCategory {
  const haystack = [
    s.title ?? "",
    s.primaryKeyword ?? "",
    ...(s.secondaryKeywords ?? []),
  ]
    .filter((x) => x && x.trim().length > 0)
    .join(" ")

  /* 1. 키워드 매칭 */
  for (const rule of KEYWORD_RULES) {
    if (rule.patterns.some((re) => re.test(haystack))) {
      return rule.category
    }
  }

  /* 2. journey_stage fallback */
  if (s.journeyStage && STAGE_FALLBACK[s.journeyStage]) {
    return STAGE_FALLBACK[s.journeyStage]
  }

  /* 3. 디폴트 */
  return "입주 가이드"
}

/** UI 미리보기/디버그용 — 어떤 규칙으로 결정됐는지 함께 반환 */
export function pickDabCategoryWithReason(s: CategorySignals): {
  category: DabCategory
  reason: "keyword" | "journey_stage" | "default"
  matchedPattern?: string
} {
  const haystack = [
    s.title ?? "",
    s.primaryKeyword ?? "",
    ...(s.secondaryKeywords ?? []),
  ]
    .filter((x) => x && x.trim().length > 0)
    .join(" ")

  for (const rule of KEYWORD_RULES) {
    for (const re of rule.patterns) {
      if (re.test(haystack)) {
        return { category: rule.category, reason: "keyword", matchedPattern: re.source }
      }
    }
  }

  if (s.journeyStage && STAGE_FALLBACK[s.journeyStage]) {
    return { category: STAGE_FALLBACK[s.journeyStage], reason: "journey_stage" }
  }

  return { category: "입주 가이드", reason: "default" }
}
