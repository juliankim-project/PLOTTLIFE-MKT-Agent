/**
 * 플라트 메타 168개에서 선별한 블로그 주제 후보 키워드.
 * 8개 카테고리로 분류. 각 키워드는 네이버 keywordstool 로
 * 실제 월검색량·경쟁도를 enrich 한다.
 */

export type KeywordCategory =
  | "location"     // 📍 지역 (서울 동네)
  | "campus"       // 🎓 대학 주변
  | "type"         // 🏠 매물 타입
  | "duration"     // ⏱ 기간·계약
  | "option"       // 🛋 옵션·편의
  | "situation"    // 🎯 상황·니즈
  | "foreigner"    // 🌏 외국인·유학생
  | "seasonal"     // 📅 시즌성 (파생)

export interface SeedKeyword {
  keyword: string
  category: KeywordCategory
  note?: string
}

export const CATEGORY_META: Record<KeywordCategory, { label: string; icon: string; color: string }> = {
  location: { label: "지역·동네", icon: "📍", color: "#3B82F6" },
  campus: { label: "대학 주변", icon: "🎓", color: "#8B5CF6" },
  type: { label: "매물 타입", icon: "🏠", color: "#0EA5E9" },
  duration: { label: "기간·계약", icon: "⏱", color: "#F59E0B" },
  option: { label: "옵션·편의", icon: "🛋", color: "#10B981" },
  situation: { label: "상황·니즈", icon: "🎯", color: "#EC4899" },
  foreigner: { label: "외국인·유학생", icon: "🌏", color: "#6366F1" },
  seasonal: { label: "시즌성", icon: "📅", color: "#F43F5E" },
}

/**
 * 65개 선별.
 * 기준:
 *  - 블로그 주제화 가능성 (단순 매물 스펙 제외)
 *  - 검색 의도 명확
 *  - 플라트 라이프 차별점과 연결
 */
export const SEED_KEYWORDS: SeedKeyword[] = [
  // 📍 지역 (서울 동네) — 14
  { keyword: "강남 단기임대", category: "location" },
  { keyword: "홍대 단기임대", category: "location" },
  { keyword: "신촌 단기임대", category: "location" },
  { keyword: "건대 단기임대", category: "location" },
  { keyword: "이태원 단기임대", category: "location" },
  { keyword: "성수 단기임대", category: "location" },
  { keyword: "잠실 단기임대", category: "location" },
  { keyword: "역삼 단기임대", category: "location" },
  { keyword: "합정 단기임대", category: "location" },
  { keyword: "망원 단기임대", category: "location" },
  { keyword: "왕십리 단기임대", category: "location" },
  { keyword: "혜화 단기임대", category: "location" },
  { keyword: "안암 단기임대", category: "location" },
  { keyword: "서울 단기임대", category: "location" },

  // 🎓 대학 주변 — 14 (주요 대학만 선별)
  { keyword: "서울대 근처 원룸", category: "campus" },
  { keyword: "연세대 근처 원룸", category: "campus" },
  { keyword: "고려대 근처 원룸", category: "campus" },
  { keyword: "성균관대 근처 원룸", category: "campus" },
  { keyword: "한양대 근처 원룸", category: "campus" },
  { keyword: "경희대 근처 원룸", category: "campus" },
  { keyword: "중앙대 근처 원룸", category: "campus" },
  { keyword: "이화여대 근처 원룸", category: "campus" },
  { keyword: "서강대 근처 원룸", category: "campus" },
  { keyword: "홍익대 근처 원룸", category: "campus" },
  { keyword: "건국대 근처 원룸", category: "campus" },
  { keyword: "한국외대 근처 원룸", category: "campus" },
  { keyword: "숙명여대 근처 원룸", category: "campus" },
  { keyword: "카이스트 근처 원룸", category: "campus" },

  // 🏠 매물 타입 — 7
  { keyword: "레지던스 단기임대", category: "type" },
  { keyword: "오피스텔 단기임대", category: "type" },
  { keyword: "원룸 단기임대", category: "type" },
  { keyword: "투룸 단기임대", category: "type" },
  { keyword: "서비스드아파트", category: "type" },
  { keyword: "주거형호텔", category: "type" },
  { keyword: "주거형 레지던스", category: "type" },

  // ⏱ 기간·계약 — 6
  { keyword: "한달살기 레지던스", category: "duration" },
  { keyword: "1주임대", category: "duration" },
  { keyword: "중장기임대 레지던스", category: "duration" },
  { keyword: "단기숙소", category: "duration" },
  { keyword: "장기체류 할인", category: "duration" },
  { keyword: "간편계약 레지던스", category: "duration" },

  // 🛋 옵션·편의 — 7
  { keyword: "풀옵션 원룸", category: "option" },
  { keyword: "가구완비 레지던스", category: "option" },
  { keyword: "주방있는 레지던스", category: "option" },
  { keyword: "무제한와이파이 레지던스", category: "option" },
  { keyword: "주차가능 레지던스", category: "option" },
  { keyword: "홈오피스 단기임대", category: "option" },
  { keyword: "업무가능 레지던스", category: "option" },

  // 🎯 상황·니즈 — 8
  { keyword: "보증금없는 단기임대", category: "situation" },
  { keyword: "보증금 없는 월세", category: "situation" },
  { keyword: "이사 단기임대", category: "situation" },
  { keyword: "재택근무 단기임대", category: "situation" },
  { keyword: "인테리어 공사 단기임대", category: "situation" },
  { keyword: "법인결제 가능한 레지던스", category: "situation" },
  { keyword: "가족 레지던스", category: "situation" },
  { keyword: "신혼부부 레지던스", category: "situation" },

  // 🌏 외국인·유학생 — 9
  { keyword: "외국인 단기임대", category: "foreigner" },
  { keyword: "외국인 월세", category: "foreigner" },
  { keyword: "외국인 방 구하기", category: "foreigner" },
  { keyword: "외국인 숙소 추천", category: "foreigner" },
  { keyword: "유학생 숙소", category: "foreigner" },
  { keyword: "유학생 월세", category: "foreigner" },
  { keyword: "교환학생 숙소", category: "foreigner" },
  { keyword: "어학연수 숙소", category: "foreigner" },
  { keyword: "유학생 방 구하기", category: "foreigner" },
]

export const SELECTION_COUNT = SEED_KEYWORDS.length
