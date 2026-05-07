/**
 * Plott Marketing Team — Unified AI Agents
 * --------------------------------------------------------------
 * 모든 에이전트는 Corey Haines marketingskills 의 SKILL.md 1개와
 * 1:1로 매핑됩니다. 페르소나(이름·이모지·캐릭터)는 친근하게,
 * 실제 동작은 검증된 마케팅 스킬을 그대로 실행.
 *
 * Source: https://skills.sh/coreyhaines31/marketingskills
 */

export type SpecialistStatus = "active" | "idle" | "ready"

export interface SkillSpecialist {
  id: string
  slug: string
  name: string
  title: string
  emoji: string
  skillUrl: string
  skillSlug: string // marketingskills 슬러그
  color: string
  bgColor: string
  tagline: string
  description: string
  status: SpecialistStatus
  jobsToBeDone: string[]
  sampleQuestions: string[]
  deliverables: string[]
  triggers: string[]
  runsCount: number
  lastRun?: string
  plottFit: string
  // Workflow stage
  stage: "diagnose" | "plan" | "execute" | "measure"
}

export const SPECIALISTS: SkillSpecialist[] = [
  // ──────────────────────────────────────────────
  // STAGE 1 · DIAGNOSE
  // ──────────────────────────────────────────────
  {
    id: "search",
    slug: "search",
    name: "SEO Auditor",
    title: "SEO 감사관",
    emoji: "🔎",
    skillSlug: "seo-audit",
    skillUrl: "https://skills.sh/coreyhaines31/marketingskills/seo-audit",
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    tagline: "기술 SEO부터 콘텐츠 갭까지 종합 진단",
    description:
      "사이트의 SEO 건강 상태를 진단하고, 키워드 기회·경쟁사 대비 갭·기술 이슈·빠르게 개선할 퀵윈을 우선순위로 정리하는 전문가.",
    status: "active",
    stage: "diagnose",
    jobsToBeDone: [
      "키워드 리서치·경쟁 분석",
      "온페이지 SEO 진단 (메타·헤더·내부링크)",
      "기술 SEO 점검 (크롤·인덱싱·사이트맵·스키마)",
      "콘텐츠 갭 도출 (경쟁사가 장악한 주제)",
      "개선안 우선순위 (퀵윈 vs 전략 투자) 리포트",
    ],
    sampleQuestions: [
      "플라트 라이프 블로그 SEO 현황 감사해줘",
      '"성수 단기임대" 키워드로 엔코스테이·미스터멘션 대비 갭은?',
      "ARC 발급 관련 롱테일 키워드 기회 찾아줘",
      "사이트 크롤·인덱싱 이슈 체크리스트 뽑아줘",
    ],
    deliverables: [
      "SEO 건강 리포트 (기술·온페이지·콘텐츠 3파트)",
      "타겟 키워드 50개 + 경쟁 강도 매트릭스",
      "퀵윈 액션 아이템 (2주 내 실행 가능)",
      "전략 투자 로드맵 (3~6개월)",
    ],
    triggers: [
      "새 페이지 발행 전 SEO 체크",
      "월간 트래픽 드롭 시 원인 진단",
      "경쟁사 신규 콘텐츠 발견 시 대응",
      "신규 카테고리·지역 진출 전 기회 분석",
    ],
    runsCount: 12,
    lastRun: "2026-04-18",
    plottFit:
      "지역·대학·ARC 같은 롱테일 SEO가 핵심 전환 레버. 매주 기회·갭을 추적해 콘텐츠 우선순위 결정.",
  },

  // ──────────────────────────────────────────────
  // STAGE 2 · PLAN
  // ──────────────────────────────────────────────
  {
    id: "stra",
    slug: "stra",
    name: "Content Strategist",
    title: "콘텐츠 전략가",
    emoji: "🗺️",
    skillSlug: "content-strategy",
    skillUrl: "https://skills.sh/coreyhaines31/marketingskills/content-strategy",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    tagline: "필러·클러스터·캘린더까지 콘텐츠 로드맵 설계",
    description:
      "비즈니스 목표 → 타겟 오디언스 → 콘텐츠 필러·클러스터 → 월·분기 콘텐츠 캘린더까지 전체 전략을 설계하고 운영 가능한 형태로 문서화.",
    status: "active",
    stage: "plan",
    jobsToBeDone: [
      "콘텐츠 필러 (3~5개) 정의",
      "필러별 클러스터 주제 맵 작성",
      "월·분기 콘텐츠 캘린더",
      "KPI·측정 프레임워크",
      "콘텐츠 재활용·리프레시 전략",
    ],
    sampleQuestions: [
      "플라트 라이프 게스트 블로그 2026 Q2 콘텐츠 전략 짜줘",
      '"방 찾기" 필러 하위 클러스터 30개 뽑아줘',
      "발행한 글 중 리프레시 후보 5편 제안해줘",
      "채널별 (블로그 vs 뉴스레터 vs 소셜) 분배 전략",
    ],
    deliverables: [
      "콘텐츠 전략 문서 (필러·클러스터·톤)",
      "3개월 에디토리얼 캘린더",
      "토픽 맵 (필러 1개당 10~20개 주제)",
      "KPI 대시보드 정의 (조회·체류·전환·공유)",
    ],
    triggers: [
      "분기 전략 수립",
      "새 필러·타겟 추가",
      "콘텐츠 성과 리뷰 후 방향 조정",
      "팀 늘어날 때 역할·프로세스 문서화",
    ],
    runsCount: 5,
    lastRun: "2026-04-15",
    plottFit:
      "STAY GUIDE / LIVING / LOCAL 3필러 구조를 분기마다 재설계하고, 파일럿 A·B·C 성과에 따라 리소스 재배분.",
  },

  {
    id: "psyche",
    slug: "psyche",
    name: "Marketing Psychologist",
    title: "마케팅 심리학자",
    emoji: "🧠",
    skillSlug: "marketing-psychology",
    skillUrl: "https://skills.sh/coreyhaines31/marketingskills/marketing-psychology",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    tagline: "행동과학 기반 설득·전환 설계",
    description:
      "Cialdini 7원칙, 손실회피, 사회적 증거, 희소성, 인지편향을 실제 카피·CTA·랜딩에 적용. \"왜 사람들이 클릭하지 않는가\"의 심리적 원인을 찾아냄.",
    status: "active",
    stage: "plan",
    jobsToBeDone: [
      "랜딩 페이지 심리 레버 진단",
      "CTA 카피·배치 행동과학 최적화",
      "가격 제시 방식 (앵커·번들·디코이)",
      "사회적 증거·권위·희소성 설계",
      "온보딩·이메일 전환 시퀀스 심리 설계",
    ],
    sampleQuestions: [
      "매물 상세 페이지 \"바로 문의\" 버튼 심리적으로 강화해줘",
      "보증금 없는 방 섹션에 손실회피 카피 적용해줘",
      "\"남은 매물 2개\" 표시가 윤리적으로 괜찮은지 점검해줘",
      "가격 3단계 (1주/1개월/3개월) 앵커링 재설계",
    ],
    deliverables: [
      "심리 레버 분석 리포트 (적용·미적용)",
      "CTA 카피 대안 3~5개 + 심리 근거",
      "A/B 테스트 가설·지표",
      "윤리적 가이드라인 (다크패턴 경계)",
    ],
    triggers: [
      "전환율 하락 원인 진단",
      "신규 CTA·가격 구조 설계",
      "타겟 오디언스 변경 시 메시지 재설계",
      "경쟁사가 쓰는 심리 레버 역분석",
    ],
    runsCount: 7,
    lastRun: "2026-04-20",
    plottFit:
      "외국인 게스트는 \"한국 처음\"의 불안 + \"온라인 계약\"의 의심이 큰 세그먼트. 신뢰·확신·희소성을 체계적으로 설계.",
  },

  // ──────────────────────────────────────────────
  // STAGE 3 · EXECUTE
  // ──────────────────────────────────────────────
  {
    id: "haru",
    slug: "haru",
    name: "Copywriter",
    title: "카피라이터",
    emoji: "✍️",
    skillSlug: "copywriting",
    skillUrl: "https://skills.sh/coreyhaines31/marketingskills/copywriting",
    color: "#F97316",
    bgColor: "#FFF7ED",
    tagline: "블로그·랜딩·이메일 본문 카피 전담",
    description:
      "타겟 오디언스의 욕구·언어를 정확히 짚어 클릭을 유도하는 카피를 쓰는 전문가. 헤드라인 10개 변형, 본문 톤 조정, CTA 카피까지 한 번에.",
    status: "active",
    stage: "execute",
    jobsToBeDone: [
      "블로그 헤드라인 10개 변형",
      "랜딩 페이지 카피 (헤더·서브·CTA)",
      "이메일 제목·본문 작성",
      "매물 상세 카피 톤 조정",
      "광고 카피 단·중·장 버전",
    ],
    sampleQuestions: [
      "성수 가이드 헤드라인 10개 뽑아줘",
      "방 둘러보기 CTA 카피 5종 변형",
      "Linh 스토리 인트로 1문단 다시 써줘",
      "신학기 캠페인 이메일 제목 + 본문",
    ],
    deliverables: [
      "헤드라인 변형 (긴/짧은 버전)",
      "본문 카피 (브랜드 보이스 적용)",
      "CTA 카피 + A/B 추천",
      "톤 가이드라인 적용 체크리스트",
    ],
    triggers: [
      "신규 블로그 발행 전",
      "랜딩 페이지 리뉴얼",
      "이메일 시퀀스 카피 작성",
      "광고 소재 헤드라인 변형",
    ],
    runsCount: 22,
    lastRun: "2026-04-21",
    plottFit:
      "외국인이 번역기로 읽어도 자연스러운 한국어. \"단기임대·풀옵션·즉시 입주\" 같은 플라트 핵심 단어를 일관되게.",
  },

  {
    id: "social",
    slug: "social",
    name: "Social Content Creator",
    title: "소셜 콘텐츠 크리에이터",
    emoji: "📱",
    skillSlug: "social-content",
    skillUrl: "https://skills.sh/coreyhaines31/marketingskills/social-content",
    color: "#EC4899",
    bgColor: "#FDF2F8",
    tagline: "플랫폼별 최적 소셜 콘텐츠 기획·작성",
    description:
      "Instagram·Threads·X·YouTube Shorts·TikTok·LinkedIn 등 플랫폼별 포맷·길이·톤에 맞춰 소셜 콘텐츠 기획·작성. 단일 주제를 여러 포맷으로 리퍼포징.",
    status: "active",
    stage: "execute",
    jobsToBeDone: [
      "블로그 1편 → 소셜 5~10개 리퍼포징",
      "플랫폼별 포맷·톤·CTA 최적화",
      "월간 소셜 콘텐츠 캘린더 수립",
      "해시태그·캡션·훅 작성",
      "시각 아이디어 (캐러셀·릴스·쇼츠) 스토리보드",
    ],
    sampleQuestions: [
      "성수동 가이드 블로그 → Instagram 캐러셀 8장으로 만들어줘",
      "ARC 3주 가이드 → Threads 시리즈 5편으로 쪼개줘",
      "유학생 Linh 스토리 → YouTube Shorts 60초 스크립트",
      "4월 Instagram 피드 월간 캘린더 짜줘",
    ],
    deliverables: [
      "플랫폼별 소셜 포스트 (풀 카피 + 해시태그)",
      "캐러셀/릴스 스토리보드 (프레임별)",
      "월간 콘텐츠 캘린더 (요일·시간 최적화)",
      "훅(Hook) 변형 5개 + A/B 추천",
    ],
    triggers: [
      "블로그 발행 후 24시간 내 소셜 확산",
      "시즌 캠페인 (신학기·한달살기 시즌)",
      "신규 매물·지역 론칭",
      "UGC·게스트 스토리 큐레이션",
    ],
    runsCount: 18,
    lastRun: "2026-04-19",
    plottFit:
      "외국인 타겟은 Instagram·YouTube·TikTok 중심. 한 블로그를 5개 플랫폼에 리퍼포징해 도달 극대화.",
  },

  {
    id: "care",
    slug: "care",
    name: "Email Marketer",
    title: "CRM·이메일 마케터",
    emoji: "💌",
    skillSlug: "email-sequence",
    skillUrl: "https://skills.sh/coreyhaines31/marketingskills/email-sequence",
    color: "#E11D48",
    bgColor: "#FFF1F2",
    tagline: "뉴스레터·시퀀스·세그먼트로 관계 유지",
    description:
      "환영·온보딩·계약 후 후속·재예약 유도·휴면 활성화까지 자동화된 이메일 시퀀스를 설계하고, 세그먼트별 맞춤 메시지로 관계를 유지하는 전문가.",
    status: "active",
    stage: "execute",
    jobsToBeDone: [
      "신규 가입·예약 환영 시퀀스",
      "예약 후 후속 (체크인·체크아웃)",
      "재예약·소개 유도 캠페인",
      "휴면 게스트 활성화",
      "세그먼트별 뉴스레터 (지역·관심 학교·언어)",
    ],
    sampleQuestions: [
      "신규 게스트 환영 5단계 이메일 시퀀스 짜줘",
      "체크아웃 24시간 후 리뷰 요청 + 재예약 쿠폰",
      "30일 휴면 게스트 활성화 이메일 작성",
      "유학생 신학기 시즌 뉴스레터 캠페인",
    ],
    deliverables: [
      "이메일 시퀀스 (단계별 트리거·시간 차)",
      "제목·본문 풀 카피 (한·영·중·일·베)",
      "세그먼트 정의 + 분기 룰",
      "성과 측정 지표 (오픈·클릭·전환)",
    ],
    triggers: [
      "신규 라이프사이클 단계 추가",
      "재예약율 하락",
      "신규 매물·지역 알림",
      "시즌 프로모션 발송",
    ],
    runsCount: 15,
    lastRun: "2026-04-17",
    plottFit:
      "단기 게스트 → 재방문·소개로 전환하는 게 핵심. 다국어 시퀀스로 LTV·NPS 동시 개선.",
  },

  // ──────────────────────────────────────────────
  // STAGE 4 · MEASURE
  // ──────────────────────────────────────────────
  {
    id: "perf",
    slug: "perf",
    name: "Performance Marketer",
    title: "퍼포먼스 마케터",
    emoji: "📊",
    skillSlug: "paid-ads",
    skillUrl: "https://skills.sh/coreyhaines31/marketingskills/paid-ads",
    color: "#6366F1",
    bgColor: "#EEF2FF",
    tagline: "광고·트래킹·ROAS 최적화",
    description:
      "Google·Meta·네이버 광고 캠페인을 설계·운영하고, 트래킹·전환 데이터를 기반으로 예산을 최적화. 채널별 ROAS·CAC·LTV를 추적해 자원 재배분.",
    status: "active",
    stage: "measure",
    jobsToBeDone: [
      "Google·Meta·네이버 광고 캠페인 설계",
      "타겟·키워드·소재·입찰 전략 수립",
      "GA4·이벤트 트래킹 설정 검토",
      "주간·월간 ROAS·CAC·LTV 리포트",
      "예산 재배분 의사결정 (채널·캠페인별)",
    ],
    sampleQuestions: [
      "성수 매물 캠페인 Google Ads 키워드 입찰안 짜줘",
      "유학생 타겟 Meta 광고 오디언스 세팅 검토",
      "이번 달 ROAS 채널별 분석 + 다음 달 예산 재배분",
      "GA4에서 \"이 방 둘러보기\" 클릭 이벤트 트래킹 검토",
    ],
    deliverables: [
      "캠페인 구조 (캠페인·세트·소재 트리)",
      "트래킹 이벤트 설계 + 검증 체크리스트",
      "주간 성과 리포트 (ROAS·CAC·CTR·CVR)",
      "예산 재배분 권장안",
    ],
    triggers: [
      "신규 캠페인 런칭",
      "ROAS 임계치 하향 시 진단",
      "분기 예산 계획",
      "광고 정책 변경 대응 (쿠키·iOS)",
    ],
    runsCount: 31,
    lastRun: "2026-04-21",
    plottFit:
      "외국인 게스트 유입은 Google 검색·Meta 광고가 주력. 다국어 캠페인 + ROAS 최적화로 CAC 낮추기.",
  },

  {
    id: "pixel",
    slug: "pixel",
    name: "Creative Designer",
    title: "광고 크리에이티브 디자이너",
    emoji: "🎨",
    skillSlug: "ad-creative",
    skillUrl: "https://skills.sh/coreyhaines31/marketingskills/ad-creative",
    color: "#06B6D4",
    bgColor: "#ECFEFF",
    tagline: "광고 비주얼·썸네일·캐러셀 디자인",
    description:
      "Meta·Google·YouTube 광고 비주얼, 썸네일, 캐러셀, 배너를 빠르게 생산. 카피라이터(하루)와 협업해 헤드라인-비주얼 일관성을 유지.",
    status: "active",
    stage: "execute",
    jobsToBeDone: [
      "광고 소재 (정적·동영상) 5종 변형",
      "캐러셀·릴스 비주얼 스토리보드",
      "썸네일 디자인 (YouTube·블로그)",
      "이메일·랜딩 비주얼 에셋",
      "브랜드 일관성 가이드라인 적용",
    ],
    sampleQuestions: [
      "성수 캠페인 Meta 광고 소재 5종 만들어줘",
      "ARC 가이드 블로그 썸네일 3안",
      "신학기 유학생 캐러셀 8장 시각 컨셉",
      "웜톤 브랜드 컬러로 광고 배너 5종",
    ],
    deliverables: [
      "정적 광고 소재 5종 (1:1·9:16·16:9)",
      "동영상 광고 스토리보드 (프레임별)",
      "썸네일 디자인 (3안 + A/B 추천)",
      "브랜드 컬러·폰트 가이드 적용",
    ],
    triggers: [
      "신규 광고 캠페인 런칭",
      "광고 피로 (ad fatigue) 발생 시 갱신",
      "신규 매물·지역 비주얼 에셋",
      "시즌 캠페인 디자인 변경",
    ],
    runsCount: 14,
    lastRun: "2026-04-20",
    plottFit:
      "플라트 웜톤 (#74594B 갈색) 일관 적용. 외국인 친화적 비주얼 (다국적 모델·풍경 사진).",
  },
]

// ── Workflow 4단계 ──────────────────────────────────
export const SPECIALIST_WORKFLOW = [
  {
    stage: "diagnose",
    label: "진단",
    leads: ["search"],
    description: "현재 상태 파악·기회 발견",
  },
  {
    stage: "plan",
    label: "기획",
    leads: ["stra", "psyche"],
    description: "전략·캘린더·심리 레버 설계",
  },
  {
    stage: "execute",
    label: "실행",
    leads: ["haru", "social", "care", "pixel"],
    description: "카피·소셜·이메일·디자인 제작",
  },
  {
    stage: "measure",
    label: "측정",
    leads: ["perf"],
    description: "광고·트래킹·ROAS 분석",
  },
] as const

export const STAGE_COLORS: Record<string, { bg: string; fg: string }> = {
  diagnose: { bg: "#EFF6FF", fg: "#3B82F6" },
  plan: { bg: "#FFFBEB", fg: "#D97706" },
  execute: { bg: "#FDF2F8", fg: "#DB2777" },
  measure: { bg: "#EEF2FF", fg: "#6366F1" },
}
