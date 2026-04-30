"use client"

import React from "react"
import Link from "next/link"
import type { IconName } from "../_lib/stages"

// ══════════════════════════════════════════════════════════════
// Icon — stroke-only SVG, 16px default (framework 세트 그대로)
// ══════════════════════════════════════════════════════════════
export function Icon({
  name,
  size = 16,
  stroke = 1.7,
  style,
  className,
}: {
  name: IconName
  size?: number
  stroke?: number
  style?: React.CSSProperties
  className?: string
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style,
    className,
  }
  const paths: Record<IconName, React.ReactNode> = {
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </>
    ),
    sparkles: (
      <>
        <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" />
      </>
    ),
    target: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.5" />
      </>
    ),
    pen: (
      <>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </>
    ),
    check: <path d="M4 12l5 5L20 6" />,
    send: (
      <>
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4 20-7z" />
      </>
    ),
    chart: (
      <>
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 4 4 5-6" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    chevron: <path d="m9 6 6 6-6 6" />,
    chevronD: <path d="m6 9 6 6 6-6" />,
    filter: <path d="M3 4h18l-7 9v6l-4 2v-8z" />,
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    link: (
      <>
        <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
        <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
      </>
    ),
    upload: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <path d="m17 8-5-5-5 5" />
        <path d="M12 3v12" />
      </>
    ),
    rss: (
      <>
        <path d="M4 11a9 9 0 0 1 9 9" />
        <path d="M4 4a16 16 0 0 1 16 16" />
        <circle cx="5" cy="19" r="1.5" />
      </>
    ),
    trend: (
      <>
        <path d="M23 6l-9.5 9.5-5-5L1 18" />
        <path d="M17 6h6v6" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    hash: <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />,
    sort: (
      <>
        <path d="M7 4v16M3 8l4-4 4 4" />
        <path d="M17 20V4M13 16l4 4 4-4" />
      </>
    ),
    bolt: <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />,
    bookmark: <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />,
    eye: (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </>
    ),
    flow: (
      <>
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="15" y="3" width="6" height="6" rx="1" />
        <rect x="9" y="15" width="6" height="6" rx="1" />
        <path d="M6 9v3h12V9M12 12v3" />
      </>
    ),
    globe: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
      </>
    ),
  }
  return <svg {...common}>{paths[name]}</svg>
}

// ══════════════════════════════════════════════════════════════
// PageHeader
// ══════════════════════════════════════════════════════════════
export interface PageAction {
  label: string
  primary?: boolean
  icon?: IconName
  onClick?: () => void
  href?: string
}

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions = [],
}: {
  eyebrow: React.ReactNode
  title: React.ReactNode
  sub?: React.ReactNode
  actions?: PageAction[]
}) {
  return (
    <div
      className="page-header"
      style={{ display: "flex", alignItems: "flex-end", gap: 20, justifyContent: "space-between" }}
    >
      <div>
        <span className="page-header__eyebrow">{eyebrow}</span>
        <h1 className="page-header__title">{title}</h1>
        {sub && <p className="page-header__sub">{sub}</p>}
      </div>
      {actions.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {actions.map((a) => {
            const cls = `bbtn ${a.primary ? "bbtn--primary" : "bbtn--ghost"}`
            const inner = (
              <>
                {a.icon && <Icon name={a.icon} size={13} />}
                {a.label}
              </>
            )
            /* href 있으면 Link (자동 prefetch) — 페이지 전환 빠름 */
            if (a.href) {
              return (
                <Link key={a.label} href={a.href} prefetch className={cls}>
                  {inner}
                </Link>
              )
            }
            return (
              <button key={a.label} onClick={a.onClick} className={cls}>
                {inner}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MiniKPI — 아이콘 + 값 + delta
// ══════════════════════════════════════════════════════════════
export function MiniKPI({
  label,
  value,
  delta,
  tone = "up",
  icon,
}: {
  label: string
  value: string | number
  delta?: string
  tone?: "up" | "down" | "neutral"
  icon: IconName
}) {
  return (
    <div className="bkpi" style={{ display: "flex", gap: 14, alignItems: "center" }}>
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: "var(--brand-50)",
          color: "var(--brand-600)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={17} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="bkpi__label">{label}</div>
        <div className="bkpi__value">{value}</div>
        {delta && (
          <div
            className={`bkpi__delta${tone === "down" ? " bkpi__delta--down" : ""}`}
            style={tone === "neutral" ? { color: "var(--text-muted)" } : undefined}
          >
            {delta}
          </div>
        )}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MiniStat — 작은 수치 카드
// ══════════════════════════════════════════════════════════════
export function MiniStat({
  label,
  value,
  accent = false,
}: {
  label: string
  value: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      style={{
        padding: "5px 7px",
        background: accent ? "var(--brand-100)" : "white",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--r-sm)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 9.5, color: "var(--text-muted)", fontWeight: 600 }}>{label}</div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: accent ? "var(--brand-700)" : "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// CatCard — 카테고리 카드 (아이콘·제목·서브·아이템 리스트)
// ══════════════════════════════════════════════════════════════
export function CatCard({
  icon,
  tone,
  title,
  items,
  sub,
}: {
  icon: IconName
  tone: "cyan" | "violet" | "indigo" | "rose" | "emerald" | "amber"
  title: string
  items: string[]
  sub?: string
}) {
  const toneStyle: Record<typeof tone, { bg: string; fg: string }> = {
    cyan: { bg: "#ECFEFF", fg: "#0E7490" },
    violet: { bg: "#F5F3FF", fg: "#6D28D9" },
    indigo: { bg: "#EEF2FF", fg: "#4338CA" },
    rose: { bg: "#FFF1F2", fg: "#BE123C" },
    emerald: { bg: "#ECFDF5", fg: "#047857" },
    amber: { bg: "#FFFBEB", fg: "#B45309" },
  } as const
  const s = toneStyle[tone]
  return (
    <div
      style={{
        padding: 22,
        background: "var(--bg-surface)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--r-lg)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            display: "grid",
            placeItems: "center",
            background: s.bg,
            color: s.fg,
          }}
        >
          <Icon name={icon} size={18} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em" }}>{title}</div>
      </div>
      {sub && (
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14, lineHeight: 1.45 }}>
          {sub}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {items.map((i) => (
          <div
            key={i}
            style={{
              fontSize: 14,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "5px 0",
              lineHeight: 1.5,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: 50,
                background: s.fg,
                opacity: 0.6,
                flexShrink: 0,
              }}
            />
            {i}
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// ScoreRing — conic-gradient 스코어 링
// ══════════════════════════════════════════════════════════════
export function ScoreRing({
  score,
  size = 38,
  color,
}: {
  score: number
  size?: number
  color?: string
}) {
  const c = color ?? (score >= 80 ? "var(--accent-emerald)" : score >= 65 ? "var(--brand-500)" : "var(--accent-amber)")
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        position: "relative",
        background: `conic-gradient(${c} ${score * 3.6}deg, var(--bg-muted) 0)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 3,
          background: "white",
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          fontSize: Math.round(size * 0.32),
          fontWeight: 700,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {score}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// Toggle
// ══════════════════════════════════════════════════════════════
export function Toggle({
  defaultOn = false,
  onChange,
}: {
  defaultOn?: boolean
  onChange?: (v: boolean) => void
}) {
  const [v, set] = React.useState(defaultOn)
  return (
    <button
      type="button"
      onClick={() => {
        const next = !v
        set(next)
        onChange?.(next)
      }}
      style={{
        width: 34,
        height: 20,
        borderRadius: 10,
        background: v ? "var(--brand-600)" : "var(--border-strong)",
        position: "relative",
        transition: "background .2s",
        border: 0,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: v ? 16 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "white",
          transition: "left .2s",
          boxShadow: "0 1px 2px rgba(0,0,0,.2)",
        }}
      />
    </button>
  )
}

// ══════════════════════════════════════════════════════════════
// SectionHead — 섹션 제목 + 서브
// ══════════════════════════════════════════════════════════════
export function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ margin: "8px 0 14px" }}>
      <h2
        style={{
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: "-.015em",
          margin: "0 0 4px",
        }}
      >
        {title}
      </h2>
      {sub && <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>{sub}</p>}
    </div>
  )
}
