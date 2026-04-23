export type AgentStatus = "idle" | "working" | "done";

export interface AgentTask {
  id: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  assignee: string;
  createdAt: string;
  description?: string;
}

export interface Agent {
  id: string;
  name: string;
  title: string;
  role: string;
  color: string;
  bgColor: string;
  skills: string[];
  status: AgentStatus;
  currentTask?: string;
  completedTasks: number;
  totalTasks: number;
  // gamification
  level: number;
  xp: number;
  maxXp: number;
  streak: number; // 연속 작업일
  badge?: string; // 칭호
  mood: "happy" | "focused" | "chill" | "fired-up";
  // office position (grid col/row for desk placement)
  deskPosition: { row: number; col: number };
}

export const agents: Agent[] = [
  {
    id: "content-marketer",
    name: "하루",
    title: "콘텐츠 마케터 · 대리",
    role: "블로그, SNS 콘텐츠 기획/작성",
    color: "#F97316",
    bgColor: "#FFF7ED",
    skills: ["블로그 작성", "SNS 콘텐츠", "카피라이팅", "콘텐츠 캘린더"],
    status: "working",
    currentTask: "이번 주 블로그 포스트 초안 작성",
    completedTasks: 12,
    totalTasks: 15,
    level: 8,
    xp: 720,
    maxXp: 1000,
    streak: 5,
    badge: "글쟁이",
    mood: "focused",
    deskPosition: { row: 0, col: 0 },
  },
  {
    id: "seo-expert",
    name: "서치",
    title: "SEO 전문가 · 과장",
    role: "검색 최적화, 키워드 분석",
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    skills: ["키워드 리서치", "온페이지 SEO", "기술 SEO", "경쟁사 분석"],
    status: "idle",
    completedTasks: 8,
    totalTasks: 10,
    level: 12,
    xp: 450,
    maxXp: 1200,
    streak: 3,
    badge: "검색왕",
    mood: "chill",
    deskPosition: { row: 0, col: 1 },
  },
  {
    id: "performance-marketer",
    name: "퍼포",
    title: "퍼포먼스 마케터 · 차장",
    role: "광고 성과 분석, 캠페인 최적화",
    color: "#8B5CF6",
    bgColor: "#F5F3FF",
    skills: ["Google Ads", "Meta Ads", "ROAS 분석", "A/B 테스트"],
    status: "working",
    currentTask: "4월 캠페인 성과 리포트 분석",
    completedTasks: 20,
    totalTasks: 22,
    level: 15,
    xp: 980,
    maxXp: 1500,
    streak: 7,
    badge: "데이터 마스터",
    mood: "fired-up",
    deskPosition: { row: 0, col: 2 },
  },
  {
    id: "crm-retention",
    name: "케어",
    title: "CRM/리텐션 · 부장",
    role: "고객 관리, 리텐션 전략, 이메일 마케팅",
    color: "#EC4899",
    bgColor: "#FDF2F8",
    skills: ["이메일 마케팅", "고객 세그먼트", "리텐션 분석", "자동화 시퀀스"],
    status: "done",
    completedTasks: 18,
    totalTasks: 18,
    level: 20,
    xp: 1800,
    maxXp: 2000,
    streak: 12,
    badge: "팀장님",
    mood: "happy",
    deskPosition: { row: 1, col: 0 },
  },
  {
    id: "service-planner",
    name: "플래니",
    title: "서비스 기획자 · 과장",
    role: "서비스/제품 기획, 요구사항 분석",
    color: "#10B981",
    bgColor: "#ECFDF5",
    skills: ["PRD 작성", "유저 스토리", "와이어프레임", "데이터 분석"],
    status: "working",
    currentTask: "신규 랜딩페이지 기획서 작성",
    completedTasks: 14,
    totalTasks: 17,
    level: 11,
    xp: 630,
    maxXp: 1100,
    streak: 4,
    badge: "아이디어뱅크",
    mood: "focused",
    deskPosition: { row: 1, col: 1 },
  },
  {
    id: "marketing-planner",
    name: "스트래",
    title: "마케팅 기획자 · 차장",
    role: "마케팅 전략 기획, 캠페인 설계",
    color: "#F59E0B",
    bgColor: "#FFFBEB",
    skills: ["GTM 전략", "캠페인 설계", "예산 관리", "시장 분석"],
    status: "idle",
    completedTasks: 11,
    totalTasks: 13,
    level: 14,
    xp: 870,
    maxXp: 1400,
    streak: 2,
    badge: "전략가",
    mood: "chill",
    deskPosition: { row: 1, col: 2 },
  },
  {
    id: "ui-ux-designer",
    name: "픽셀",
    title: "UI/UX 디자이너 · 대리",
    role: "디자인 시스템, 랜딩페이지 디자인",
    color: "#06B6D4",
    bgColor: "#ECFEFF",
    skills: ["UI 디자인", "프로토타이핑", "디자인 시스템", "사용성 테스트"],
    status: "working",
    currentTask: "프로모션 배너 디자인",
    completedTasks: 9,
    totalTasks: 12,
    level: 7,
    xp: 580,
    maxXp: 800,
    streak: 6,
    badge: "픽셀퍼펙트",
    mood: "happy",
    deskPosition: { row: 2, col: 1 },
  },
];

export const mockTasks: AgentTask[] = [
  {
    id: "task-1",
    title: "4월 블로그 콘텐츠 캘린더 작성",
    status: "done",
    assignee: "content-marketer",
    createdAt: "2026-04-10",
    description: "4월 남은 기간 블로그 주제 및 일정 수립",
  },
  {
    id: "task-2",
    title: "이번 주 블로그 포스트 초안 작성",
    status: "in_progress",
    assignee: "content-marketer",
    createdAt: "2026-04-14",
    description: "플라트라이프 신규 서비스 소개 블로그 글",
  },
  {
    id: "task-3",
    title: "주요 키워드 순위 모니터링",
    status: "done",
    assignee: "seo-expert",
    createdAt: "2026-04-12",
  },
  {
    id: "task-4",
    title: "경쟁사 SEO 전략 분석 리포트",
    status: "todo",
    assignee: "seo-expert",
    createdAt: "2026-04-15",
  },
  {
    id: "task-5",
    title: "4월 캠페인 성과 리포트 분석",
    status: "in_progress",
    assignee: "performance-marketer",
    createdAt: "2026-04-14",
    description: "Google Ads + Meta Ads 통합 성과 분석",
  },
  {
    id: "task-6",
    title: "리타겟팅 캠페인 A/B 테스트 설계",
    status: "todo",
    assignee: "performance-marketer",
    createdAt: "2026-04-15",
  },
  {
    id: "task-7",
    title: "이탈 고객 윈백 이메일 시퀀스 완성",
    status: "done",
    assignee: "crm-retention",
    createdAt: "2026-04-11",
  },
  {
    id: "task-8",
    title: "VIP 고객 세그먼트 재정의",
    status: "done",
    assignee: "crm-retention",
    createdAt: "2026-04-13",
  },
  {
    id: "task-9",
    title: "신규 랜딩페이지 기획서 작성",
    status: "in_progress",
    assignee: "service-planner",
    createdAt: "2026-04-13",
    description: "봄 시즌 프로모션 랜딩페이지 PRD",
  },
  {
    id: "task-10",
    title: "유저 퍼널 분석 리포트",
    status: "todo",
    assignee: "service-planner",
    createdAt: "2026-04-15",
  },
  {
    id: "task-11",
    title: "Q2 마케팅 전략 수립",
    status: "todo",
    assignee: "marketing-planner",
    createdAt: "2026-04-15",
    description: "2분기 마케팅 예산 배분 및 채널 전략",
  },
  {
    id: "task-12",
    title: "프로모션 배너 디자인",
    status: "in_progress",
    assignee: "ui-ux-designer",
    createdAt: "2026-04-14",
    description: "봄 시즌 메인 프로모션 배너 3종",
  },
  {
    id: "task-13",
    title: "이메일 템플릿 리디자인",
    status: "todo",
    assignee: "ui-ux-designer",
    createdAt: "2026-04-15",
  },
];
