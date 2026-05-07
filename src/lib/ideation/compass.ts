/**
 * 아이데이션 3축 Compass — 클라이언트·서버 공유 상수
 * 목적(Intent) × 세그먼트(Segment) × 상황(Context)
 */

/* ── Intent ──────────────────────────────────────────────── */
export const INTENTS = ["discover", "convince", "enable", "retain", "advocate"] as const
export type Intent = (typeof INTENTS)[number]

export interface IntentDef {
  id: Intent
  ko: string
  en: string
  emoji: string
  color: string
  desc: string
  when: string
}

export const INTENT_DEFS: Record<Intent, IntentDef> = {
  discover: {
    id: "discover",
    ko: "발견·유입",
    en: "Discover",
    emoji: "🧭",
    color: "#2563eb",
    desc: "처음 접하는 독자 — 검색 허브·롱테일 SEO",
    when: "Consider 단계 새 독자가 검색창에 질문을 입력할 때",
  },
  convince: {
    id: "convince",
    ko: "설득·결단",
    en: "Convince",
    emoji: "🤝",
    color: "#7c3aed",
    desc: "망설이는 독자 — 비교·리뷰·대안 검증",
    when: "Prepare/Wrapup — 여러 선택지 중 결단이 필요한 순간",
  },
  enable: {
    id: "enable",
    ko: "실행 돕기",
    en: "Enable",
    emoji: "📘",
    color: "#0ea5e9",
    desc: "예약 직전·직후 — 체크리스트·절차 안내·FAQ",
    when: "Prepare/Arrive/Settle — 지금 당장 뭘 해야 하는지 알려주기",
  },
  retain: {
    id: "retain",
    ko: "체류 만족",
    en: "Retain",
    emoji: "💚",
    color: "#059669",
    desc: "머무는 독자 — 라이프스타일·동네·팁",
    when: "Live/Explore — 이미 쓰고 있는 사람 만족도 높이기",
  },
  advocate: {
    id: "advocate",
    ko: "재방문·추천",
    en: "Advocate",
    emoji: "🔁",
    color: "#ea580c",
    desc: "떠난 독자 — 리텐션·입소문·동창 네트워크",
    when: "Change — 귀국 후 재방문·추천·알럼나이 리텐션",
  },
}

export const INTENT_ORDER: Intent[] = ["discover", "convince", "enable", "retain", "advocate"]

/* ── Journey Stage (8단계) ──────────────────────────────── */
export const JOURNEY_STAGES = [
  "consider",
  "prepare",
  "arrive",
  "settle",
  "live",
  "explore",
  "wrapup",
  "change",
] as const
export type JourneyStage = (typeof JOURNEY_STAGES)[number]

export interface StageDef {
  id: JourneyStage
  ko: string
  en: string
  emoji: string
  shortDesc: string
}

export const STAGE_DEFS: Record<JourneyStage, StageDef> = {
  consider: { id: "consider", ko: "고민", en: "Consider", emoji: "🤔", shortDesc: "한국 체류 막연히 생각 중" },
  prepare:  { id: "prepare",  ko: "준비", en: "Prepare",  emoji: "📋", shortDesc: "예약·출국 직전 준비" },
  arrive:   { id: "arrive",   ko: "도착", en: "Arrive",   emoji: "✈️", shortDesc: "한국 도착·첫 입주" },
  settle:   { id: "settle",   ko: "정착", en: "Settle",   emoji: "🏡", shortDesc: "은행·행정·일상 셋업" },
  live:     { id: "live",     ko: "생활", en: "Live",     emoji: "🌱", shortDesc: "일상 적응·생활 요령" },
  explore:  { id: "explore",  ko: "탐방", en: "Explore",  emoji: "🗺", shortDesc: "동네·주말·시즌 경험" },
  wrapup:   { id: "wrapup",   ko: "마무리", en: "Wrap-up", emoji: "📦", shortDesc: "귀국 서류·계약해지 OR 연장·재계약 결정" },
  change:   { id: "change",   ko: "변화", en: "Change",   emoji: "🔄", shortDesc: "연장·이사·귀국 후 재방문·추천" },
}

/** UI 라벨 — 기존 코드 호환용 ("Consider", "Prepare", ...) */
export const CLUSTER_LABEL: Record<JourneyStage, string> = {
  consider: "고민 · Consider",
  prepare: "준비 · Prepare",
  arrive: "도착 · Arrive",
  settle: "정착 · Settle",
  live: "생활 · Live",
  explore: "탐방 · Explore",
  wrapup: "마무리 · Wrap-up",
  change: "변화 · Change",
}

/* ── 시즌 (달력 기반) ─────────────────────────────────── */
export interface SeasonTag {
  id: string
  ko: string
  en?: string
  hint?: string
  evergreen?: boolean
}

export const SEASONS: SeasonTag[] = [
  { id: "evergreen", ko: "상시", hint: "계절 무관하게 항시 검색되는 상시 콘텐츠 (evergreen)", evergreen: true },
  { id: "spring-admission", ko: "3월 입학", hint: "2~3월 · 봄학기 입학·교환학생" },
  { id: "fall-semester", ko: "9월 학기", hint: "8~9월 · 가을학기 입학" },
  { id: "summer", ko: "여름 휴가", hint: "6~8월 · 한달살기 피크" },
  { id: "winter-break", ko: "겨울 방학", hint: "12~2월 · 겨울 방학·어학연수" },
  { id: "year-end", ko: "연말·연초", hint: "12~1월 · 재계약·새해 이동" },
  { id: "holiday", ko: "설·추석", hint: "명절 — 단기 체류 수요 급증" },
  { id: "bloom-fall", ko: "벚꽃·단풍", hint: "4월·10~11월 · 관광 유입 피크" },
]

/* ── 라이프 트리거 ────────────────────────────────────── */
export interface LifeTriggerTag {
  id: string
  ko: string
  hint?: string
}

export const LIFE_TRIGGERS: LifeTriggerTag[] = [
  { id: "first-stay", ko: "첫 체류", hint: "한국 처음 오는 게스트" },
  { id: "renewal-near", ko: "재계약 임박", hint: "계약 만료 직전" },
  { id: "move-gap", ko: "이사 공백", hint: "이전 집 ↔ 새 집 사이 공백" },
  { id: "pre-departure", ko: "출국 앞두고", hint: "귀국 1~2개월 전" },
  { id: "job-transfer", ko: "이직·전근", hint: "직장 발령·파견" },
  { id: "family-visit", ko: "가족 방문", hint: "부모·파트너 방한" },
  { id: "k-event", ko: "K-이벤트", hint: "K-pop·스포츠·전시" },
]

/* ── Pain Point / 서비스 레버 ───────────────────────── */
export interface PainTag {
  id: string
  ko: string
  /** 플라트 라이프 서비스 차별점으로 연결 가능한지 */
  isServiceLever?: boolean
}

export const PAIN_TAGS: PainTag[] = [
  { id: "no-deposit", ko: "보증금 0원", isServiceLever: true },
  { id: "arc", ko: "ARC 발급", isServiceLever: true },
  { id: "english-support", ko: "영어 응대", isServiceLever: true },
  { id: "contract-free", ko: "계약 없이 단기", isServiceLever: true },
  { id: "location", ko: "위치/역세권" },
  { id: "furnished", ko: "가구·풀옵션", isServiceLever: true },
]

/* ── Helpers ───────────────────────────────────────── */
export function stageKo(stage: string | null | undefined): string {
  if (!stage) return "—"
  return STAGE_DEFS[stage as JourneyStage]?.ko ?? stage
}

export function intentKo(intent: string | null | undefined): string {
  if (!intent) return "—"
  return INTENT_DEFS[intent as Intent]?.ko ?? intent
}

export function isValidIntent(v: unknown): v is Intent {
  return typeof v === "string" && (INTENTS as readonly string[]).includes(v)
}

export function isValidStage(v: unknown): v is JourneyStage {
  return typeof v === "string" && (JOURNEY_STAGES as readonly string[]).includes(v)
}

/**
 * 자연어 문장에서 3축을 거칠게 추론 (UI에 자동 반영용 힌트).
 * 정확한 분류는 LLM이 하지만, UI 즉시 반응을 위한 1차 추론.
 */
export function guessAxesFromText(text: string): {
  intents: Intent[]
  stages: JourneyStage[]
  seasons: string[]
  triggers: string[]
  pains: string[]
} {
  const t = text.toLowerCase()
  const result = {
    intents: [] as Intent[],
    stages: [] as JourneyStage[],
    seasons: [] as string[],
    triggers: [] as string[],
    pains: [] as string[],
  }

  // intent
  if (/비교|vs|차이|추천|어디가 나|리뷰|후기/.test(text)) result.intents.push("convince")
  if (/체크리스트|순서|절차|어떻게|방법|how/.test(text)) result.intents.push("enable")
  if (/맛집|동네|주말|탐방|투어/.test(text)) result.intents.push("retain")
  if (/재방문|추천|알럼나이|다시/.test(text)) result.intents.push("advocate")
  if (result.intents.length === 0) result.intents.push("discover")

  // stage
  if (/고민|할까|갈까|막연/.test(text)) result.stages.push("consider")
  if (/준비|출국|예약|전에|before/.test(text)) result.stages.push("prepare")
  if (/도착|첫날|입주|arrive/.test(text)) result.stages.push("arrive")
  if (/정착|은행|통신|arc|등록|설정/i.test(text)) result.stages.push("settle")
  if (/생활|적응|일상|배달|세탁/.test(text)) result.stages.push("live")
  if (/여행|주말|벚꽃|단풍|맛집|카페/.test(text)) result.stages.push("explore")
  if (/마무리|해지|정산|연장|재계약|귀국 전/.test(text)) result.stages.push("wrapup")
  if (/귀국|떠난 후|이후/.test(text) && !/전/.test(text)) result.stages.push("change")

  // seasons
  if (/3월|봄학기|입학/.test(text)) result.seasons.push("spring-admission")
  if (/9월|가을학기/.test(text)) result.seasons.push("fall-semester")
  if (/여름|휴가|한달살기/.test(text)) result.seasons.push("summer")
  if (/겨울|어학연수/.test(text)) result.seasons.push("winter-break")
  if (/설|추석|명절/.test(text)) result.seasons.push("holiday")
  if (/벚꽃|단풍/.test(text)) result.seasons.push("bloom-fall")

  // triggers
  if (/첫|처음|first/i.test(text)) result.triggers.push("first-stay")
  if (/재계약|연장/.test(text)) result.triggers.push("renewal-near")
  if (/이사|공백/.test(text)) result.triggers.push("move-gap")
  if (/출국|떠나|귀국 전/.test(text)) result.triggers.push("pre-departure")
  if (/발령|전근|이직/.test(text)) result.triggers.push("job-transfer")
  if (/가족|부모|방한/.test(text)) result.triggers.push("family-visit")

  // pains
  if (/보증금/.test(text)) result.pains.push("no-deposit")
  if (/arc|외국인 등록/i.test(text)) result.pains.push("arc")
  if (/영어|english/i.test(text)) result.pains.push("english-support")
  if (/계약 없|단기|주 단위|월 단위/.test(text)) result.pains.push("contract-free")
  if (/역세권|위치|강남|홍대|성수|이태원/.test(text)) result.pains.push("location")
  if (/풀옵션|가구|가전/.test(text)) result.pains.push("furnished")

  return result
}
