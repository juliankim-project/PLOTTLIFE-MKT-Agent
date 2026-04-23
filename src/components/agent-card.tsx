"use client";

import { Agent } from "@/lib/agents";
import { characterMap } from "@/components/characters";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const statusConfig = {
  idle: { label: "대기 중", color: "bg-gray-400", badgeVariant: "secondary" as const },
  working: { label: "작업 중", color: "bg-green-500", badgeVariant: "default" as const },
  done: { label: "완료", color: "bg-blue-500", badgeVariant: "outline" as const },
};

interface AgentCardProps {
  agent: Agent;
  onClick: () => void;
  isSelected: boolean;
}

export function AgentCard({ agent, onClick, isSelected }: AgentCardProps) {
  const Character = characterMap[agent.id];
  const status = statusConfig[agent.status];

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 relative overflow-hidden",
        isSelected && "ring-2 ring-primary shadow-lg"
      )}
      onClick={onClick}
    >
      {/* Status indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full", status.color, agent.status === "working" && "animate-pulse")} />
        <span className="text-[11px] text-muted-foreground">{status.label}</span>
      </div>

      <CardContent className="pt-6 pb-4 px-4">
        {/* Character */}
        <div
          className="w-full aspect-square rounded-xl mb-3 flex items-center justify-center relative overflow-hidden"
          style={{ backgroundColor: agent.bgColor }}
        >
          {Character && <Character className="w-4/5 h-4/5" />}

          {/* Speech bubble for working status */}
          {agent.status === "working" && agent.currentTask && (
            <div className="absolute bottom-1 left-1 right-1 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm">
              <p className="text-[10px] text-gray-600 truncate">{agent.currentTask}</p>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{agent.name}</h3>
            <Badge variant={status.badgeVariant} className="text-[10px] px-1.5 py-0">
              {agent.completedTasks}/{agent.totalTasks}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">{agent.title}</p>

          {/* Progress bar */}
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
            <div
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: `${(agent.completedTasks / agent.totalTasks) * 100}%`,
                backgroundColor: agent.color,
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
