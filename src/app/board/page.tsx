"use client";

import { useState } from "react";
import { agents, mockTasks, AgentTask } from "@/lib/agents";
import { characterMap } from "@/components/characters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const columns = [
  { id: "todo" as const, label: "할 일", color: "bg-gray-500" },
  { id: "in_progress" as const, label: "진행 중", color: "bg-blue-500" },
  { id: "done" as const, label: "완료", color: "bg-green-500" },
];

export default function BoardPage() {
  const [tasks, setTasks] = useState<AgentTask[]>(mockTasks);

  const moveTask = (taskId: string, newStatus: AgentTask["status"]) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  return (
    <div className="p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">작업 보드</h1>
        <p className="text-sm text-muted-foreground mt-1">
          에이전트들의 작업 현황을 칸반 보드로 확인합니다.
        </p>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        {columns.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col min-h-0">
              {/* Column Header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                <h2 className="font-semibold text-sm">{col.label}</h2>
                <Badge variant="secondary" className="text-xs ml-auto">
                  {colTasks.length}
                </Badge>
              </div>

              {/* Column Body */}
              <div className="flex-1 bg-muted/50 rounded-xl p-3 space-y-2.5 overflow-auto">
                {colTasks.map((task) => {
                  const agent = agents.find((a) => a.id === task.assignee);
                  const Character = agent ? characterMap[agent.id] : null;

                  return (
                    <TaskCard
                      key={task.id}
                      task={task}
                      agent={agent}
                      Character={Character}
                      onMove={moveTask}
                    />
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    작업이 없습니다
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  agent,
  Character,
  onMove,
}: {
  task: AgentTask;
  agent: ReturnType<typeof agents.find>;
  Character: React.ComponentType<{ className?: string }> | null;
  onMove: (taskId: string, status: AgentTask["status"]) => void;
}) {
  return (
    <Card className="p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2.5">
        {/* Agent avatar */}
        {agent && Character && (
          <div
            className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
            style={{ backgroundColor: agent.bgColor }}
          >
            <Character className="w-6 h-6" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">
              {agent?.name} · {task.createdAt}
            </span>

            {/* Move buttons */}
            <div className="flex gap-1">
              {task.status !== "todo" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() =>
                    onMove(
                      task.id,
                      task.status === "done" ? "in_progress" : "todo"
                    )
                  }
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6"/>
                  </svg>
                </Button>
              )}
              {task.status !== "done" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() =>
                    onMove(
                      task.id,
                      task.status === "todo" ? "in_progress" : "done"
                    )
                  }
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
