import type { TargetKPI } from "@/lib/blog/schema"
import { KPI_DEFINITIONS } from "@/lib/blog/schema"
import { cn } from "@/lib/utils"

export function KPIBadge({
  kpi,
  size = "sm",
  showIcon = true,
}: {
  kpi: TargetKPI
  size?: "xs" | "sm" | "md"
  showIcon?: boolean
}) {
  const def = KPI_DEFINITIONS[kpi]
  const sizeClass = {
    xs: "text-[10px] px-1.5 py-0.5",
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
  }[size]

  const bgColor = {
    conversion: "bg-emerald-100 text-emerald-700 border-emerald-200",
    traffic: "bg-blue-100 text-blue-700 border-blue-200",
    dwell_time: "bg-purple-100 text-purple-700 border-purple-200",
  }[kpi]

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        sizeClass,
        bgColor
      )}
    >
      {showIcon && <span>{def.icon}</span>}
      {def.label}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const config = {
    idea: { label: "아이디어", className: "bg-gray-100 text-gray-700" },
    scheduled: { label: "예약됨", className: "bg-amber-100 text-amber-700" },
    drafting: { label: "작성중", className: "bg-blue-100 text-blue-700" },
    reviewing: { label: "검수중", className: "bg-purple-100 text-purple-700" },
    published: { label: "발행됨", className: "bg-green-100 text-green-700" },
    rewriting: { label: "리라이트", className: "bg-red-100 text-red-700" },
  }[status] ?? { label: status, className: "bg-gray-100 text-gray-700" }

  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", config.className)}>
      {config.label}
    </span>
  )
}
