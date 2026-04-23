"use client";

import { Agent } from "@/lib/agents";
import { characterMap } from "@/components/characters";
import { cn } from "@/lib/utils";

const moodEmoji = {
  happy: "😊",
  focused: "🔥",
  chill: "☕",
  "fired-up": "⚡",
};

const statusGlow = {
  idle: "shadow-gray-200",
  working: "shadow-green-300/60",
  done: "shadow-blue-300/60",
};

interface OfficeDeskProps {
  agent: Agent;
  onClick: () => void;
  isSelected: boolean;
}

export function OfficeDesk({ agent, onClick, isSelected }: OfficeDeskProps) {
  const Character = characterMap[agent.id];

  return (
    <div
      className={cn(
        "relative cursor-pointer group transition-all duration-300",
        "hover:scale-[1.03]",
        isSelected && "scale-[1.03]"
      )}
      onClick={onClick}
    >
      {/* Desk surface - isometric style */}
      <div className="relative">
        {/* Desk shadow */}
        <div className="absolute -bottom-2 left-3 right-3 h-4 bg-black/5 rounded-full blur-md" />

        {/* Desk body */}
        <div
          className={cn(
            "relative rounded-2xl border-2 overflow-hidden transition-all duration-300",
            isSelected ? "border-primary shadow-xl" : "border-transparent hover:border-gray-200",
            `shadow-lg ${statusGlow[agent.status]}`
          )}
          style={{ backgroundColor: agent.bgColor }}
        >
          {/* Working indicator - animated top bar */}
          {agent.status === "working" && (
            <div className="h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent animate-[shimmer_2s_infinite]" />
            </div>
          )}
          {agent.status === "done" && (
            <div className="h-1 bg-blue-400" />
          )}
          {agent.status === "idle" && (
            <div className="h-1 bg-gray-200" />
          )}

          <div className="p-4 pb-3">
            {/* Character area */}
            <div className="relative flex justify-center mb-3">
              {/* Mood emoji floating */}
              <div className={cn(
                "absolute -top-1 -right-1 text-lg z-10",
                agent.status === "working" && "animate-bounce",
              )}>
                {moodEmoji[agent.mood]}
              </div>

              {/* Level badge */}
              <div
                className="absolute -top-1 -left-1 z-10 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-md"
                style={{ backgroundColor: agent.color }}
              >
                {agent.level}
              </div>

              {/* Character with desk scene */}
              <div className="relative w-28 h-28">
                {/* Monitor behind character */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-20 h-14 bg-gray-800 rounded-t-lg flex items-center justify-center overflow-hidden">
                  <div className="w-[90%] h-[85%] rounded-sm bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    {agent.status === "working" ? (
                      <div className="space-y-0.5">
                        <div className="w-8 h-0.5 bg-green-400/60 rounded" />
                        <div className="w-6 h-0.5 bg-green-400/40 rounded" />
                        <div className="w-7 h-0.5 bg-green-400/50 rounded" />
                        <div className="w-4 h-0.5 bg-green-400/30 rounded" />
                      </div>
                    ) : agent.status === "done" ? (
                      <span className="text-green-400 text-xs">✓</span>
                    ) : (
                      <div className="w-3 h-3 rounded-full bg-gray-600 animate-pulse" />
                    )}
                  </div>
                </div>
                {/* Monitor stand */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-2 bg-gray-600 rounded-b" />

                {/* Character sitting in front */}
                {Character && (
                  <div className={cn(
                    "absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-24",
                    agent.status === "working" && "animate-[bobble_3s_ease-in-out_infinite]",
                  )}>
                    <Character className="w-full h-full drop-shadow-md" />
                  </div>
                )}

                {/* Streak fire */}
                {agent.streak >= 5 && (
                  <div className="absolute -bottom-1 right-0 text-sm animate-pulse">
                    🔥{agent.streak}
                  </div>
                )}
              </div>
            </div>

            {/* Speech bubble */}
            {agent.status === "working" && agent.currentTask && (
              <div className="relative bg-white rounded-xl px-3 py-2 mb-2 shadow-sm border">
                <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t rotate-45" />
                <p className="text-[11px] text-gray-600 leading-snug text-center truncate relative z-10">
                  &ldquo;{agent.currentTask}&rdquo;
                </p>
              </div>
            )}
            {agent.status === "idle" && (
              <div className="relative bg-white/70 rounded-xl px-3 py-2 mb-2 border border-dashed border-gray-200">
                <p className="text-[11px] text-gray-400 text-center">💤 대기 중...</p>
              </div>
            )}
            {agent.status === "done" && (
              <div className="relative bg-blue-50 rounded-xl px-3 py-2 mb-2 border border-blue-100">
                <p className="text-[11px] text-blue-600 text-center">✅ 오늘 할 일 완료!</p>
              </div>
            )}

            {/* Name & Title */}
            <div className="text-center mb-2">
              <div className="flex items-center justify-center gap-1.5">
                <h3 className="font-bold text-sm">{agent.name}</h3>
                {agent.badge && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded-full font-medium text-white"
                    style={{ backgroundColor: agent.color }}
                  >
                    {agent.badge}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{agent.title}</p>
            </div>

            {/* XP Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>XP</span>
                <span>{agent.xp}/{agent.maxXp}</span>
              </div>
              <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden border border-black/5">
                <div
                  className="h-full rounded-full transition-all duration-1000 relative overflow-hidden"
                  style={{
                    width: `${(agent.xp / agent.maxXp) * 100}%`,
                    backgroundColor: agent.color,
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                </div>
              </div>
            </div>

            {/* Task progress pills */}
            <div className="flex items-center justify-center gap-0.5 mt-2">
              {Array.from({ length: agent.totalTasks }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    i < agent.completedTasks
                      ? "scale-100"
                      : "bg-white/50 scale-75"
                  )}
                  style={i < agent.completedTasks ? { backgroundColor: agent.color } : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
