"use client";

import { Agent, mockTasks } from "@/lib/agents";
import { characterMap } from "@/components/characters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const moodLabel = {
  happy: "😊 기분 좋음",
  focused: "🔥 집중 모드",
  chill: "☕ 여유 중",
  "fired-up": "⚡ 불타는 중",
};

const taskStatusConfig = {
  todo: { label: "할 일", color: "bg-gray-100 text-gray-700", dot: "bg-gray-400" },
  in_progress: { label: "진행 중", color: "bg-amber-100 text-amber-700", dot: "bg-amber-400" },
  done: { label: "완료", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
};

interface AgentProfilePanelProps {
  agent: Agent;
  onClose: () => void;
}

export function AgentProfilePanel({ agent, onClose }: AgentProfilePanelProps) {
  const Character = characterMap[agent.id];
  const agentTasks = mockTasks.filter((t) => t.assignee === agent.id);
  const xpPct = Math.round((agent.xp / agent.maxXp) * 100);
  const completionPct = Math.round((agent.completedTasks / agent.totalTasks) * 100);

  return (
    <div className="w-[380px] border-l bg-background h-full flex flex-col animate-in slide-in-from-right-full duration-300">
      {/* Header - character showcase */}
      <div
        className="relative p-6 pb-4"
        style={{ background: `linear-gradient(135deg, ${agent.bgColor}, white)` }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center transition-colors shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: agent.bgColor, border: `2px solid ${agent.color}40` }}
            >
              {Character && <Character className="w-16 h-16" />}
            </div>
            {/* Level circle */}
            <div
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-md border-2 border-white"
              style={{ backgroundColor: agent.color }}
            >
              {agent.level}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg">{agent.name}</h2>
              {agent.badge && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-medium text-white"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.badge}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{agent.title}</p>
            <p className="text-xs mt-1">{moodLabel[agent.mood]}</p>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium">Lv.{agent.level}</span>
            <span className="text-muted-foreground">{agent.xp} / {agent.maxXp} XP</span>
          </div>
          <div className="h-3 bg-white/60 rounded-full overflow-hidden border border-black/5">
            <div
              className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
              style={{ width: `${xpPct}%`, backgroundColor: agent.color }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2">
            <StatCard
              icon="🔥"
              label="연속"
              value={`${agent.streak}일`}
              color={agent.streak >= 5 ? "#EF4444" : "#9CA3AF"}
            />
            <StatCard
              icon="✅"
              label="완료율"
              value={`${completionPct}%`}
              color={agent.color}
            />
            <StatCard
              icon="⭐"
              label="생산성"
              value={completionPct >= 90 ? "S" : completionPct >= 70 ? "A" : "B"}
              color={completionPct >= 90 ? "#FBBF24" : agent.color}
            />
          </div>

          {/* Skills */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">스킬</h3>
            <div className="flex flex-wrap gap-1.5">
              {agent.skills.map((skill) => (
                <span
                  key={skill}
                  className="text-xs px-2.5 py-1 rounded-lg font-medium"
                  style={{ backgroundColor: agent.bgColor, color: agent.color, border: `1px solid ${agent.color}30` }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <Separator />

          {/* Task progress visual */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">작업 진행</h3>
              <span className="text-xs font-medium" style={{ color: agent.color }}>
                {agent.completedTasks}/{agent.totalTasks}
              </span>
            </div>
            {/* Visual task dots */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {Array.from({ length: agent.totalTasks }).map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-4 rounded-md transition-all flex items-center justify-center text-[8px]"
                  style={
                    i < agent.completedTasks
                      ? { backgroundColor: agent.color, color: "white" }
                      : { backgroundColor: `${agent.color}15`, border: `1px dashed ${agent.color}40` }
                  }
                >
                  {i < agent.completedTasks ? "✓" : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Tasks list */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">작업 내역</h3>
            <div className="space-y-2">
              {agentTasks.map((task) => {
                const cfg = taskStatusConfig[task.status];
                return (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug">{task.title}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${cfg.color}`}>
                            {cfg.label}
                          </span>
                        </div>
                        {task.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-muted-foreground">{task.createdAt}</span>
                          {task.status === "done" && <span className="text-[10px]">+50 XP</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action */}
          <Button className="w-full rounded-xl h-11 font-medium" style={{ backgroundColor: agent.color }}>
            ✨ 작업 요청하기
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div className="p-3 rounded-xl border bg-card text-center">
      <span className="text-base">{icon}</span>
      <p className="text-lg font-bold mt-0.5" style={{ color }}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
