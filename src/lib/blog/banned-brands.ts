/**
 * 본문·인용·출처 어디에도 절대 등장해서는 안 되는 타사·경쟁사 브랜드.
 *
 * 사용처 (다층 방어):
 *  1) writer factPrompt / 본문 prompt — explicit ban list 주입
 *  2) writer factsText 정제 — grounded fact 응답에서 해당 라인 제거
 *  3) writer 본문 후처리 — detectBannedBrands hits → 1회 재작성, 그래도 남으면 stripSentencesWithBannedBrands
 *  4) source-format isAllowedSource — 도메인 hard block
 *  5) review.ts 검수 ban 룰
 *
 * 사유:
 *  - 경쟁사 직접 언급 시 법적 리스크 + 브랜드 일관성 훼손
 *  - 우리 콘텐츠가 경쟁사를 광고하는 효과
 */

import "server-only"

/** 본문 텍스트에서 매칭할 브랜드명 (한글·영문·로마자 표기 모두) */
export const BANNED_COMPETITOR_BRANDS: readonly string[] = [
  /* ── 단기임대 직접 경쟁사 ── */
  "엔코스테이",
  "미스터멘션", "Mr.Mention", "MrMention", "Mister Mention",
  "위홈", "Wehome", "wehome",
  "스테이폴리오", "Stayfolio", "stayfolio",
  "더스테이", "TheStay",
  "코지스테이",
  "넘버25", "Number25",
  "블루그라운드", "Blueground",
  "어반스테이", "Urbanstay",
  /* ── OTA·숙박 플랫폼 ── */
  "야놀자", "Yanolja",
  "여기어때",
  "에어비앤비", "Airbnb", "airbnb",
  "부킹닷컴", "Booking.com", "booking.com",
  "아고다", "Agoda", "agoda",
  "익스피디아", "Expedia", "expedia",
  "트립닷컴", "Trip.com",
  "호텔스닷컴", "Hotels.com",
  /* ── 호텔 체인 ── */
  "켄싱턴호텔", "켄싱턴",
  "롯데호텔",
  "신라호텔", "신라스테이",
  "메리어트", "Marriott",
  "힐튼", "Hilton",
  "하얏트", "Hyatt",
  "포시즌", "Four Seasons",
  "인터컨티넨탈", "InterContinental",
  "쉐라톤", "Sheraton",
  "L7호텔", "L7 호텔",
  "노보텔", "Novotel",
  "글래드호텔", "글래드",
  "조선호텔",
] as const

/**
 * grounding source 도메인 차단 — 경쟁사·OTA 도메인이 출처 화이트리스트를
 * 우회해서 통과하는 경우 대비. isAllowedSource 안에서 hard block.
 */
export const BANNED_COMPETITOR_DOMAINS: readonly string[] = [
  "encostay.com", "encostay.co.kr",
  "mrmention.com", "mr-mention.com", "mistermention.com",
  "wehome.me", "stayfolio.com", "thestay.co.kr",
  "yanolja.com", "goodchoice.kr",
  "airbnb.com", "airbnb.co.kr",
  "booking.com", "agoda.com",
  "expedia.com", "expedia.co.kr",
  "trip.com", "hotels.com",
  "kensingtonhotel.co.kr", "lottehotel.com",
  "shilla.net", "shillastay.com",
  "marriott.com", "hilton.com", "hyatt.com",
  "fourseasons.com", "ihg.com",
  "novotel.com", "sheraton.com",
] as const

/** 본문 / fact text 에서 금지 브랜드 hits 추출 */
export function detectBannedBrands(text: string): string[] {
  if (!text) return []
  const hits = new Set<string>()
  for (const brand of BANNED_COMPETITOR_BRANDS) {
    if (text.includes(brand)) hits.add(brand)
  }
  return Array.from(hits)
}

/** 도메인이 경쟁사인지 — isAllowedSource 안에서 hard block 용 */
export function isBannedCompetitorDomain(domain: string | undefined | null): boolean {
  if (!domain) return false
  const d = domain.toLowerCase()
  return BANNED_COMPETITOR_DOMAINS.some((banned) => d === banned || d.endsWith(`.${banned}`))
}

/**
 * 라인 단위로 금지 브랜드 포함된 줄을 통째로 제거.
 * grounded factsText 정제용 (writer prompt 에 들어가기 전 1차 방어).
 */
export function stripLinesWithBannedBrands(text: string): string {
  if (!text) return ""
  return text
    .split(/\r?\n/)
    .filter((line) => !BANNED_COMPETITOR_BRANDS.some((b) => line.includes(b)))
    .join("\n")
}

/**
 * 문장 단위로 금지 브랜드 포함된 문장을 제거 (라인 안에 여러 문장일 때 좀 더 정밀).
 * 본문 후처리 단계 — 재작성 후에도 남은 hits 정리용.
 *  - 한국어 문장 종결: . / ! / ? / 다. / 요. / 죠. / 어요. / 데요. 등
 *  - 너무 공격적으로 자르지 않게: 종결 부호가 명확한 경우만
 */
export function stripSentencesWithBannedBrands(text: string): string {
  if (!text) return ""
  /* 라인별로 처리 — 표·헤딩 보존 */
  return text
    .split(/\r?\n/)
    .map((line) => {
      const hits = BANNED_COMPETITOR_BRANDS.filter((b) => line.includes(b))
      if (hits.length === 0) return line
      /* 한국어 문장 분리 — 종결 부호 뒤 보존 */
      const sentences = line.split(/(?<=[.!?。])\s+/)
      const filtered = sentences.filter(
        (s) => !BANNED_COMPETITOR_BRANDS.some((b) => s.includes(b))
      )
      return filtered.join(" ")
    })
    .join("\n")
}
