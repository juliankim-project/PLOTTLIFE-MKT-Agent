"use client";

import { useState, useCallback } from "react";
import { Agent, agents } from "@/lib/agents";
import { characterMap } from "@/components/characters";
import { cn } from "@/lib/utils";

// Tile size in pixels
const TILE = 48;
const COLS = 22;
const ROWS = 16;

// Tile types for the map
type TileType =
  | "floor"
  | "wall-top"
  | "wall-left"
  | "wall-right"
  | "wall-corner-tl"
  | "wall-corner-tr"
  | "carpet-a"
  | "carpet-b"
  | "carpet-c"
  | "wood";

// Furniture items placed on the map
interface Furniture {
  id: string;
  type: "desk" | "monitor" | "chair" | "plant" | "whiteboard" | "coffee" | "couch" | "bookshelf" | "water-cooler" | "lamp" | "rug";
  x: number;
  y: number;
  w?: number;
  h?: number;
}

// Agent positions on the map (tile coordinates)
interface AgentPosition {
  agentId: string;
  x: number;
  y: number;
  facing: "down" | "up" | "left" | "right";
}

const agentPositions: AgentPosition[] = [
  { agentId: "content-marketer", x: 3, y: 4, facing: "down" },
  { agentId: "seo-expert", x: 7, y: 4, facing: "down" },
  { agentId: "performance-marketer", x: 11, y: 4, facing: "down" },
  { agentId: "crm-retention", x: 17, y: 4, facing: "down" },
  { agentId: "service-planner", x: 5, y: 10, facing: "down" },
  { agentId: "marketing-planner", x: 11, y: 10, facing: "down" },
  { agentId: "ui-ux-designer", x: 17, y: 10, facing: "down" },
];

const furniture: Furniture[] = [
  // Row 1 desks (top row)
  { id: "desk-1", type: "desk", x: 2, y: 3, w: 3, h: 1 },
  { id: "desk-2", type: "desk", x: 6, y: 3, w: 3, h: 1 },
  { id: "desk-3", type: "desk", x: 10, y: 3, w: 3, h: 1 },
  { id: "desk-4", type: "desk", x: 16, y: 3, w: 3, h: 1 },

  // Row 1 monitors
  { id: "mon-1", type: "monitor", x: 3, y: 3 },
  { id: "mon-2", type: "monitor", x: 7, y: 3 },
  { id: "mon-3", type: "monitor", x: 11, y: 3 },
  { id: "mon-4", type: "monitor", x: 17, y: 3 },

  // Row 2 desks (bottom row)
  { id: "desk-5", type: "desk", x: 4, y: 9, w: 3, h: 1 },
  { id: "desk-6", type: "desk", x: 10, y: 9, w: 3, h: 1 },
  { id: "desk-7", type: "desk", x: 16, y: 9, w: 3, h: 1 },

  // Row 2 monitors
  { id: "mon-5", type: "monitor", x: 5, y: 9 },
  { id: "mon-6", type: "monitor", x: 11, y: 9 },
  { id: "mon-7", type: "monitor", x: 17, y: 9 },

  // Decorations
  { id: "plant-1", type: "plant", x: 1, y: 1 },
  { id: "plant-2", type: "plant", x: 20, y: 1 },
  { id: "plant-3", type: "plant", x: 1, y: 14 },
  { id: "plant-4", type: "plant", x: 20, y: 14 },
  { id: "plant-5", type: "plant", x: 14, y: 3 },
  { id: "plant-6", type: "plant", x: 14, y: 9 },

  // Meeting area
  { id: "whiteboard", type: "whiteboard", x: 1, y: 7, w: 1, h: 3 },

  // Break area
  { id: "coffee", type: "coffee", x: 19, y: 7 },
  { id: "water", type: "water-cooler", x: 20, y: 7 },
  { id: "couch-1", type: "couch", x: 18, y: 12, w: 3, h: 1 },

  // Bookshelf
  { id: "books", type: "bookshelf", x: 1, y: 12, w: 2, h: 1 },

  // Lamps
  { id: "lamp-1", type: "lamp", x: 5, y: 1 },
  { id: "lamp-2", type: "lamp", x: 16, y: 1 },
];

// Build floor map
function getFloorTile(x: number, y: number): TileType {
  // Walls
  if (y === 0) {
    if (x === 0) return "wall-corner-tl";
    if (x === COLS - 1) return "wall-corner-tr";
    return "wall-top";
  }
  if (x === 0) return "wall-left";
  if (x === COLS - 1) return "wall-right";

  // Carpet areas under desks
  if (y >= 2 && y <= 5 && x >= 2 && x <= 5) return "carpet-a";
  if (y >= 2 && y <= 5 && x >= 6 && x <= 9) return "carpet-b";
  if (y >= 2 && y <= 5 && x >= 10 && x <= 13) return "carpet-a";
  if (y >= 2 && y <= 5 && x >= 16 && x <= 19) return "carpet-c";

  if (y >= 8 && y <= 11 && x >= 4 && x <= 7) return "carpet-b";
  if (y >= 8 && y <= 11 && x >= 10 && x <= 13) return "carpet-c";
  if (y >= 8 && y <= 11 && x >= 16 && x <= 19) return "carpet-a";

  // Wood floor for corridors
  if (y === 6 || y === 7) return "wood";

  return "floor";
}

const tileColors: Record<TileType, string> = {
  "floor": "#E8E0D4",
  "wall-top": "#8B7E74",
  "wall-left": "#9B8E84",
  "wall-right": "#9B8E84",
  "wall-corner-tl": "#7B6E64",
  "wall-corner-tr": "#7B6E64",
  "carpet-a": "#C5D5C0",
  "carpet-b": "#BCCFE0",
  "carpet-c": "#E0C5D5",
  "wood": "#D4C4A8",
};

const moodEmoji: Record<string, string> = {
  happy: "😊",
  focused: "🔥",
  chill: "☕",
  "fired-up": "⚡",
};

interface GatherOfficeProps {
  onSelectAgent: (agent: Agent | null) => void;
  selectedAgentId: string | null;
}

export function GatherOffice({ onSelectAgent, selectedAgentId }: GatherOfficeProps) {
  const [hoveredAgent, setHoveredAgent] = useState<string | null>(null);

  const handleAgentClick = useCallback(
    (agentId: string) => {
      const agent = agents.find((a) => a.id === agentId) ?? null;
      if (selectedAgentId === agentId) {
        onSelectAgent(null);
      } else {
        onSelectAgent(agent);
      }
    },
    [selectedAgentId, onSelectAgent]
  );

  return (
    <div className="flex justify-center items-start p-6 overflow-auto">
      <div
        className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-gray-300"
        style={{
          width: COLS * TILE,
          height: ROWS * TILE,
        }}
      >
        {/* Floor tiles */}
        {Array.from({ length: ROWS }).map((_, y) =>
          Array.from({ length: COLS }).map((_, x) => {
            const tileType = getFloorTile(x, y);
            return (
              <div
                key={`${x}-${y}`}
                className="absolute border-r border-b border-black/[0.04]"
                style={{
                  left: x * TILE,
                  top: y * TILE,
                  width: TILE,
                  height: TILE,
                  backgroundColor: tileColors[tileType],
                }}
              />
            );
          })
        )}

        {/* Wall details */}
        <div
          className="absolute left-0 right-0 top-0 pointer-events-none"
          style={{ height: TILE }}
        >
          {/* Wall texture pattern */}
          <div className="w-full h-full flex items-end justify-center">
            <div className="text-[10px] text-white/30 font-mono tracking-[0.5em] pb-1">
              PLOTT MARKETING HQ
            </div>
          </div>
        </div>

        {/* Window on top wall */}
        {[4, 8, 12, 17].map((wx) => (
          <div
            key={`win-${wx}`}
            className="absolute rounded-sm"
            style={{
              left: wx * TILE + 4,
              top: 4,
              width: TILE * 2 - 8,
              height: TILE - 10,
              background: "linear-gradient(180deg, #87CEEB 0%, #B0E0E6 60%, #E0F0FF 100%)",
              border: "2px solid #6B5E54",
              boxShadow: "inset 0 0 8px rgba(255,255,255,0.5)",
            }}
          />
        ))}

        {/* Furniture rendering */}
        {furniture.map((f) => (
          <FurnitureItem key={f.id} item={f} />
        ))}

        {/* Zone labels on floor */}
        <div
          className="absolute text-[9px] font-bold tracking-[0.2em] text-black/10 uppercase select-none pointer-events-none"
          style={{ left: 3 * TILE, top: 6 * TILE + 14 }}
        >
          CREATIVE ZONE
        </div>
        <div
          className="absolute text-[9px] font-bold tracking-[0.2em] text-black/10 uppercase select-none pointer-events-none"
          style={{ left: 9 * TILE, top: 7 * TILE + 14 }}
        >
          STRATEGY ROOM
        </div>
        <div
          className="absolute text-[9px] font-bold tracking-[0.2em] text-black/10 uppercase select-none pointer-events-none"
          style={{ left: 17 * TILE, top: 13 * TILE + 8 }}
        >
          LOUNGE
        </div>

        {/* Agents */}
        {agentPositions.map((pos) => {
          const agent = agents.find((a) => a.id === pos.agentId);
          if (!agent) return null;
          const Character = characterMap[agent.id];
          const isSelected = selectedAgentId === agent.id;
          const isHovered = hoveredAgent === agent.id;

          return (
            <div
              key={agent.id}
              className="absolute cursor-pointer z-10"
              style={{
                left: pos.x * TILE - TILE * 0.3,
                top: pos.y * TILE - TILE * 0.6,
                width: TILE * 1.6,
                height: TILE * 1.8,
              }}
              onClick={() => handleAgentClick(agent.id)}
              onMouseEnter={() => setHoveredAgent(agent.id)}
              onMouseLeave={() => setHoveredAgent(null)}
            >
              {/* Selection / proximity ring */}
              <div
                className={cn(
                  "absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full transition-all duration-300",
                  isSelected
                    ? "w-12 h-4 opacity-100"
                    : isHovered
                    ? "w-10 h-3 opacity-60"
                    : "w-8 h-3 opacity-0"
                )}
                style={{
                  backgroundColor: agent.color,
                  filter: "blur(4px)",
                }}
              />

              {/* Shadow */}
              <div
                className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-2 bg-black/15 rounded-full blur-[2px]"
              />

              {/* Character sprite */}
              <div
                className={cn(
                  "relative transition-transform duration-200",
                  agent.status === "working" && "animate-[bobble_3s_ease-in-out_infinite]",
                  (isHovered || isSelected) && "scale-110",
                )}
              >
                {Character && <Character className="w-full h-full drop-shadow-md" />}
              </div>

              {/* Floating name tag */}
              <div
                className={cn(
                  "absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap transition-all duration-200",
                  isHovered || isSelected ? "opacity-100 -translate-y-1" : "opacity-80"
                )}
              >
                {/* Speech bubble when working */}
                {(isHovered || isSelected) && agent.status === "working" && agent.currentTask && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 w-40">
                    <div className="bg-white rounded-lg px-2 py-1 shadow-lg border text-[9px] text-gray-600 text-center leading-snug">
                      &ldquo;{agent.currentTask}&rdquo;
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r border-b rotate-45" />
                    </div>
                  </div>
                )}

                <div
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-md"
                  style={{ backgroundColor: agent.color }}
                >
                  {/* Status dot */}
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      agent.status === "working" && "bg-green-300 animate-pulse",
                      agent.status === "idle" && "bg-gray-300",
                      agent.status === "done" && "bg-blue-300",
                    )}
                  />
                  {agent.name}
                  <span className="text-white/70">{agent.level}</span>
                </div>
              </div>

              {/* Mood emoji */}
              <div
                className={cn(
                  "absolute -top-3 -right-1 text-sm transition-all",
                  agent.status === "working" && "animate-bounce",
                  !isHovered && !isSelected && "opacity-60 scale-90"
                )}
              >
                {moodEmoji[agent.mood]}
              </div>

              {/* Streak fire */}
              {agent.streak >= 5 && (
                <div className="absolute -top-3 -left-1 text-[10px] animate-pulse">
                  🔥{agent.streak}
                </div>
              )}

              {/* XP bar under character */}
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10">
                <div className="h-[3px] bg-black/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(agent.xp / agent.maxXp) * 100}%`,
                      backgroundColor: agent.color,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FurnitureItem({ item }: { item: Furniture }) {
  const w = (item.w ?? 1) * TILE;
  const h = (item.h ?? 1) * TILE;

  switch (item.type) {
    case "desk":
      return (
        <div
          className="absolute rounded-sm pointer-events-none"
          style={{
            left: item.x * TILE,
            top: item.y * TILE,
            width: w,
            height: h,
            background: "linear-gradient(180deg, #C4956A 0%, #A67B5B 100%)",
            border: "1px solid #8B6B4A",
            boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
          }}
        >
          {/* Desk edge highlight */}
          <div className="absolute top-0 left-1 right-1 h-[2px] bg-white/20 rounded-full" />
        </div>
      );

    case "monitor":
      return (
        <div
          className="absolute pointer-events-none"
          style={{ left: item.x * TILE + 10, top: item.y * TILE + 4 }}
        >
          {/* Screen */}
          <div
            className="rounded-sm relative overflow-hidden"
            style={{
              width: TILE - 20,
              height: TILE * 0.6,
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              border: "2px solid #333",
              boxShadow: "0 0 6px rgba(100,200,255,0.15)",
            }}
          >
            {/* Screen glow lines */}
            <div className="absolute inset-1 space-y-[3px] pt-1">
              <div className="w-[60%] h-[2px] bg-green-400/40 rounded" />
              <div className="w-[80%] h-[2px] bg-blue-400/30 rounded" />
              <div className="w-[45%] h-[2px] bg-green-400/25 rounded" />
            </div>
          </div>
          {/* Stand */}
          <div className="mx-auto w-2 h-1.5 bg-gray-500" />
          <div className="mx-auto w-5 h-1 bg-gray-500 rounded-b-sm" />
        </div>
      );

    case "plant":
      return (
        <div
          className="absolute pointer-events-none flex flex-col items-center justify-end select-none"
          style={{ left: item.x * TILE, top: item.y * TILE, width: TILE, height: TILE }}
        >
          <span className="text-xl leading-none">🪴</span>
        </div>
      );

    case "whiteboard":
      return (
        <div
          className="absolute pointer-events-none"
          style={{
            left: item.x * TILE + 4,
            top: item.y * TILE,
            width: TILE - 8,
            height: (item.h ?? 1) * TILE,
          }}
        >
          <div
            className="w-full h-full rounded-sm"
            style={{
              background: "white",
              border: "2px solid #9CA3AF",
              boxShadow: "2px 0 4px rgba(0,0,0,0.1)",
            }}
          >
            {/* Whiteboard content */}
            <div className="p-1 space-y-1">
              <div className="w-3/4 h-[2px] bg-red-300/60 rounded" />
              <div className="w-1/2 h-[2px] bg-blue-300/60 rounded" />
              <div className="w-2/3 h-[2px] bg-green-300/60 rounded" />
              <div className="w-4 h-4 border border-purple-300/50 rounded-sm mt-1" />
            </div>
          </div>
        </div>
      );

    case "coffee":
      return (
        <div
          className="absolute pointer-events-none flex flex-col items-center justify-center select-none"
          style={{ left: item.x * TILE, top: item.y * TILE, width: TILE, height: TILE }}
        >
          <div className="w-8 h-10 bg-gradient-to-b from-gray-600 to-gray-700 rounded-sm relative">
            <div className="absolute -top-1 left-1 right-1 h-2 bg-gray-500 rounded-t-sm" />
            <span className="absolute inset-0 flex items-center justify-center text-[8px]">☕</span>
          </div>
        </div>
      );

    case "water-cooler":
      return (
        <div
          className="absolute pointer-events-none flex flex-col items-center justify-center select-none"
          style={{ left: item.x * TILE, top: item.y * TILE, width: TILE, height: TILE }}
        >
          <span className="text-lg">🚰</span>
        </div>
      );

    case "couch":
      return (
        <div
          className="absolute pointer-events-none"
          style={{
            left: item.x * TILE + 2,
            top: item.y * TILE + 8,
            width: w - 4,
            height: h - 12,
          }}
        >
          <div
            className="w-full h-full rounded-lg"
            style={{
              background: "linear-gradient(180deg, #6366F1 0%, #4F46E5 100%)",
              border: "1px solid #4338CA",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            }}
          >
            {/* Cushions */}
            <div className="flex h-full items-center justify-around px-2">
              <div className="w-8 h-5 bg-white/10 rounded" />
              <div className="w-8 h-5 bg-white/10 rounded" />
              <div className="w-8 h-5 bg-white/10 rounded" />
            </div>
          </div>
        </div>
      );

    case "bookshelf":
      return (
        <div
          className="absolute pointer-events-none"
          style={{
            left: item.x * TILE,
            top: item.y * TILE + 2,
            width: w,
            height: h - 4,
          }}
        >
          <div
            className="w-full h-full rounded-sm flex flex-col justify-around p-0.5"
            style={{
              background: "linear-gradient(180deg, #8B6914 0%, #704F0F 100%)",
              border: "1px solid #5C400A",
            }}
          >
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex gap-[1px] px-0.5">
                {Array.from({ length: 6 + row }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-[1px]"
                    style={{
                      height: 6 + Math.random() * 4,
                      backgroundColor: ["#E74C3C", "#3498DB", "#2ECC71", "#F39C12", "#9B59B6", "#1ABC9C"][i % 6],
                      opacity: 0.7 + Math.random() * 0.3,
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      );

    case "lamp":
      return (
        <div
          className="absolute pointer-events-none flex flex-col items-center justify-end select-none"
          style={{ left: item.x * TILE, top: item.y * TILE, width: TILE, height: TILE }}
        >
          <div className="relative">
            <div className="w-6 h-4 bg-amber-200 rounded-t-full border border-amber-300" />
            <div className="w-1 h-4 bg-gray-400 mx-auto" />
            <div className="w-4 h-1 bg-gray-500 rounded-full mx-auto" />
            {/* Light glow */}
            <div className="absolute -inset-3 bg-amber-200/20 rounded-full blur-md -z-10" />
          </div>
        </div>
      );

    default:
      return null;
  }
}
