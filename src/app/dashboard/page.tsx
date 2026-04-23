"use client";

import { agents, mockTasks } from "@/lib/agents";
import { characterMap } from "@/components/characters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const kpiData = [
  { label: "총 콘텐츠 발행", value: "47건", change: "+12%", positive: true },
  { label: "오가닉 트래픽", value: "12,450", change: "+8.3%", positive: true },
  { label: "전환율", value: "3.2%", change: "-0.4%", positive: false },
  { label: "CAC", value: "₩15,200", change: "-5.1%", positive: true },
  { label: "LTV/CAC", value: "4.8x", change: "+0.3", positive: true },
  { label: "이메일 오픈율", value: "24.5%", change: "+2.1%", positive: true },
];

const weeklyHighlights = [
  { agent: "content-marketer", text: "플라트라이프 봄 시즌 블로그 시리즈 3편 발행 완료" },
  { agent: "seo-expert", text: "'단기임대' 키워드 검색 순위 3위 → 1위 달성" },
  { agent: "performance-marketer", text: "Meta 리타겟팅 캠페인 ROAS 320% 달성" },
  { agent: "crm-retention", text: "이탈 고객 윈백 이메일 시퀀스 완성, 오픈율 28%" },
  { agent: "service-planner", text: "봄 시즌 프로모션 랜딩페이지 PRD 초안 완성" },
  { agent: "marketing-planner", text: "Q2 마케팅 예산 배분안 초안 완성" },
  { agent: "ui-ux-designer", text: "프로모션 배너 A/B 테스트 디자인 시안 2종 완성" },
];

export default function DashboardPage() {
  const totalTasks = mockTasks.length;
  const doneTasks = mockTasks.filter((t) => t.status === "done").length;
  const inProgressTasks = mockTasks.filter((t) => t.status === "in_progress").length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">팀 대시보드</h1>
        <p className="text-sm text-muted-foreground mt-1">
          마케팅 에이전트 팀의 주간 성과와 KPI를 한눈에 확인합니다.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiData.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-[11px] text-muted-foreground font-medium">{kpi.label}</p>
              <p className="text-xl font-bold mt-1">{kpi.value}</p>
              <span
                className={`text-xs font-medium ${kpi.positive ? "text-green-600" : "text-red-500"}`}
              >
                {kpi.change}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">에이전트별 작업 완료율</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {agents.map((agent) => {
              const pct = Math.round((agent.completedTasks / agent.totalTasks) * 100);
              const Character = characterMap[agent.id];
              return (
                <div key={agent.id} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: agent.bgColor }}
                  >
                    {Character && <Character className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{agent.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {agent.completedTasks}/{agent.totalTasks}
                      </span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                  <span className="text-sm font-semibold w-10 text-right" style={{ color: agent.color }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Task Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">작업 현황 요약</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{totalTasks}</p>
                <p className="text-[11px] text-muted-foreground">전체 작업</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-50">
                <p className="text-2xl font-bold text-blue-600">{inProgressTasks}</p>
                <p className="text-[11px] text-muted-foreground">진행 중</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-50">
                <p className="text-2xl font-bold text-green-600">{doneTasks}</p>
                <p className="text-[11px] text-muted-foreground">완료</p>
              </div>
            </div>

            {/* Overall progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">전체 진행률</span>
                <span className="text-sm font-bold">{Math.round((doneTasks / totalTasks) * 100)}%</span>
              </div>
              <Progress value={(doneTasks / totalTasks) * 100} className="h-3" />
            </div>

            {/* Agent status breakdown */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">에이전트 상태</p>
              <div className="flex gap-2 flex-wrap">
                {agents.map((agent) => {
                  const statusColor = {
                    idle: "bg-gray-100 text-gray-700",
                    working: "bg-green-100 text-green-700",
                    done: "bg-blue-100 text-blue-700",
                  };
                  const statusLabel = {
                    idle: "대기",
                    working: "작업 중",
                    done: "완료",
                  };
                  return (
                    <Badge
                      key={agent.id}
                      variant="secondary"
                      className={`text-xs ${statusColor[agent.status]}`}
                    >
                      {agent.name} · {statusLabel[agent.status]}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Highlights */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">이번 주 하이라이트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {weeklyHighlights.map((item, i) => {
              const agent = agents.find((a) => a.id === item.agent);
              const Character = agent ? characterMap[agent.id] : null;
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  {agent && Character && (
                    <div
                      className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5"
                      style={{ backgroundColor: agent.bgColor }}
                    >
                      <Character className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm">{item.text}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{agent?.name} · {agent?.title}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
