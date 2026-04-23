"use client"

import Link from "next/link"
import { SPECIALISTS, type SkillSpecialist } from "@/lib/skill-specialists"
import { cn } from "@/lib/utils"

export function AgentChip({
  agentId,
  size = "sm",
  showRole = false,
  linkToAgent = false,
}: {
  agentId: string
  size?: "xs" | "sm" | "md"
  showRole?: boolean
  linkToAgent?: boolean
}) {
  const agent = SPECIALISTS.find((s) => s.id === agentId)
  if (!agent) return null

  const sizeClass = {
    xs: "h-5 w-5 text-[10px]",
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
  }[size]

  const textSize = {
    xs: "text-[10px]",
    sm: "text-xs",
    md: "text-sm",
  }[size]

  const content = (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full shrink-0",
          sizeClass
        )}
        style={{ background: agent.bgColor }}
        title={`${agent.name} · ${agent.title}`}
      >
        {agent.emoji}
      </span>
      <span className={cn("font-medium whitespace-nowrap", textSize)} style={{ color: agent.color }}>
        {agent.name}
      </span>
      {showRole && (
        <span className={cn("text-muted-foreground whitespace-nowrap", textSize)}>
          · {agent.title}
        </span>
      )}
    </span>
  )

  if (linkToAgent) {
    return <Link href="/" className="hover:opacity-80">{content}</Link>
  }
  return content
}

export function AgentAvatarStack({ agentIds, max = 5 }: { agentIds: string[]; max?: number }) {
  const agents = agentIds
    .map((id) => SPECIALISTS.find((s) => s.id === id))
    .filter(Boolean) as SkillSpecialist[]
  const visible = agents.slice(0, max)
  const overflow = agents.length - visible.length

  return (
    <span className="inline-flex -space-x-1.5 items-center">
      {visible.map((a) => (
        <span
          key={a.id}
          className="h-6 w-6 rounded-full flex items-center justify-center text-xs border-2 border-white shadow-sm"
          style={{ background: a.bgColor }}
          title={`${a.name} · ${a.title}`}
        >
          {a.emoji}
        </span>
      ))}
      {overflow > 0 && (
        <span className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-semibold bg-slate-100 text-slate-600 border-2 border-white">
          +{overflow}
        </span>
      )}
    </span>
  )
}
