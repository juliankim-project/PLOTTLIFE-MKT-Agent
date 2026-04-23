"use client"

/**
 * Admin-style primitives — apps/admin 패턴 재현
 * text-2xl 제목 / muted-foreground 부제 / rounded-lg border 카드 등
 */

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

// ── Page Header ───────────────────────────────────────
export function AdminPageHeader({
  title,
  description,
  badges,
  actions,
}: {
  title: string
  description?: string
  badges?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {badges}
        </div>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}

// ── Admin Card (shadcn 스타일) ───────────────────────────
export function AdminCard({
  title,
  description,
  children,
  className,
  headerAction,
  padded = true,
}: {
  title?: string
  description?: string
  children: ReactNode
  className?: string
  headerAction?: ReactNode
  padded?: boolean
}) {
  return (
    <div className={cn("rounded-lg border bg-background", className)}>
      {(title || headerAction) && (
        <div className="flex items-start justify-between px-4 py-3 border-b">
          <div>
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {headerAction}
        </div>
      )}
      <div className={cn(padded && "p-4")}>{children}</div>
    </div>
  )
}

// ── Filter Bar ───────────────────────────────────────
export function AdminFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2.5">
      {children}
    </div>
  )
}

// ── Data Table (simple wrapper) ──────────────────────
export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border bg-background overflow-hidden">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}

// ── Status Badge ─────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-100 text-emerald-700 border-emerald-200",
  scheduled: "bg-amber-100 text-amber-700 border-amber-200",
  drafting: "bg-blue-100 text-blue-700 border-blue-200",
  reviewing: "bg-purple-100 text-purple-700 border-purple-200",
  idea: "bg-gray-100 text-gray-700 border-gray-200",
  rewriting: "bg-red-100 text-red-700 border-red-200",
}

const STATUS_LABELS: Record<string, string> = {
  published: "게시됨",
  scheduled: "예약",
  drafting: "작성중",
  reviewing: "검수",
  idea: "아이디어",
  rewriting: "리라이트",
}

export function StatusBadge({ status, size = "sm" }: { status: string; size?: "xs" | "sm" }) {
  const style = STATUS_STYLES[status] ?? "bg-gray-100 text-gray-700 border-gray-200"
  const label = STATUS_LABELS[status] ?? status
  const sizeCls = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5"
  return (
    <span className={cn("inline-flex items-center rounded-full border font-medium", sizeCls, style)}>
      {label}
    </span>
  )
}

// ── Empty State ──────────────────────────────────────
export function EmptyState({
  icon = "📭",
  title,
  description,
  action,
}: {
  icon?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="text-3xl mb-2">{icon}</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
