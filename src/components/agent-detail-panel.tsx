"use client";

import { Agent, mockTasks } from "@/lib/agents";
import { characterMap } from "@/components/characters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

const statusConfig = {
  idle: { label: "대기 중", dotColor: "bg-gray-400" },
  working: { label: "작업 중", dotColor: "bg-green-500" },
  done: { label: "완료", dotColor: "bg-blue-500" },
};

const taskStatusConfig = {
  todo: { label: "할 일", color: "bg-gray-100 text-gray-700" },
  in_progress: { label: "진행 중", color: "bg-blue-100 text-blue-700" },
  done: { label: "완료", color: "bg-green-100 text-green-700" },
};

interface AgentDetailPanelProps {
  agent: Agent;
  onClose: () => void;
}

export function AgentDetailPanel({ agent, onClose }: AgentDetailPanelProps) {
  const Character = characterMap[agent.id];
  const status = statusConfig[agent.status];
  const agentTasks = mockTasks.filter((t) => t.assignee === agent.id);

  return (
    <div className="w-[400px] border-l bg-background h-full flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-5 border-b flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: agent.bgColor }}
          >
            {Character && <Character className="w-12 h-12" />}
          </div>
          <div>
            <h2 className="font-bold text-lg">{agent.name}</h2>
            <p className="text-sm text-muted-foreground">{agent.title}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${status.dotColor}`} />
              <span className="text-xs text-muted-foreground">{status.label}</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-6">
          {/* Role */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">역할</h3>
            <p className="text-sm">{agent.role}</p>
          </div>

          {/* Skills */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">스킬</h3>
            <div className="flex flex-wrap gap-1.5">
              {agent.skills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="text-xs"
                  style={{ borderColor: agent.color + "40", backgroundColor: agent.bgColor }}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">능력치</h3>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="완료한 작업" value={agent.completedTasks} color={agent.color} />
              <StatBox label="전체 작업" value={agent.totalTasks} color={agent.color} />
              <StatBox
                label="완료율"
                value={`${Math.round((agent.completedTasks / agent.totalTasks) * 100)}%`}
                color={agent.color}
              />
              <StatBox label="생산성" value="A+" color={agent.color} />
            </div>
          </div>

          <Separator />

          {/* Tasks */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">작업 내역</h3>
            <div className="space-y-2">
              {agentTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{task.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${taskStatusConfig[task.status].color}`}>
                      {taskStatusConfig[task.status].label}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1.5">{task.createdAt}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action button */}
          <Button className="w-full" style={{ backgroundColor: agent.color }}>
            작업 요청하기
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="p-3 rounded-lg border bg-card">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
