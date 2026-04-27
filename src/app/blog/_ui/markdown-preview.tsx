/**
 * 공통 Markdown 미리보기 — write/[id] 와 contents/[id] 에서 공유.
 * 지원: H1~H3, **bold**, `code`, [link], 리스트(- *), 체크리스트(- [x]),
 *      이미지 ![alt](url) (+ Gemini 워터마크), IMAGE_SLOT 플레이스홀더 + 생성 중 스켈레톤,
 *      테이블 (|--|), 블록쿼트 / 콜아웃 (💡⚠️ℹ️✅), 구분선 (---)
 */

"use client"

import React from "react"

interface Props {
  body: string
  /** 별도 H1 으로 표시할 제목. 없으면 H1 안 그림 */
  title?: string
  /** Hero 이미지 URL */
  heroUrl?: string | null
  /** 이미지 생성 중 → IMAGE_SLOT·hero 자리에 스켈레톤 */
  generatingImages?: boolean
}

export function MarkdownPreview({ body, title, heroUrl, generatingImages = false }: Props) {
  const lines = body.split("\n")
  const elements: React.ReactNode[] = []

  if (heroUrl) {
    elements.push(<AiImage key="hero" src={heroUrl} alt={title ?? ""} hero />)
  } else if (generatingImages) {
    elements.push(<ImageSkeleton key="hero-gen" hero label="썸네일" />)
  }

  if (title) {
    elements.push(
      <h1 key="t" style={{ fontSize: 24, fontWeight: 800, marginBottom: 16, letterSpacing: "-.02em" }}>
        {title}
      </h1>
    )
  }

  let listItems: string[] = []
  let listKind: "ul" | "checklist" = "ul"
  let tableRows: string[][] | null = null
  let tableAlign: Array<"left" | "center" | "right"> | null = null
  let blockquoteLines: string[] = []

  const flushList = (idx: number) => {
    if (listItems.length > 0) {
      if (listKind === "checklist") {
        elements.push(
          <div key={`ck-${idx}`} style={{ margin: "10px 0 14px" }}>
            {listItems.map((item, j) => {
              const m = item.match(/^\[([ xX])\]\s*(.*)$/)
              const checked = m ? /[xX]/.test(m[1]) : false
              const text = m ? m[2] : item
              return (
                <div
                  key={j}
                  style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "3px 0", fontSize: 13.5 }}
                >
                  <span
                    style={{
                      display: "inline-grid",
                      placeItems: "center",
                      width: 16,
                      height: 16,
                      marginTop: 3,
                      flexShrink: 0,
                      border: `1.5px solid ${checked ? "var(--brand-600)" : "var(--border-strong)"}`,
                      background: checked ? "var(--brand-600)" : "white",
                      borderRadius: 3,
                      color: "white",
                      fontSize: 10,
                      lineHeight: 1,
                    }}
                  >
                    {checked ? "✓" : ""}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      color: "var(--text-secondary)",
                      textDecoration: checked ? "line-through" : "none",
                    }}
                  >
                    {formatInline(text)}
                  </span>
                </div>
              )
            })}
          </div>
        )
      } else {
        elements.push(
          <ul key={`ul-${idx}`} style={{ paddingLeft: 20, marginBottom: 12 }}>
            {listItems.map((item, j) => (
              <li key={j} style={{ marginBottom: 4 }}>
                {formatInline(item)}
              </li>
            ))}
          </ul>
        )
      }
      listItems = []
      listKind = "ul"
    }
  }

  const flushTable = (idx: number) => {
    if (tableRows && tableRows.length > 0) {
      const [head, ...rest] = tableRows
      elements.push(
        <div key={`tbl-${idx}`} style={{ overflowX: "auto", margin: "14px 0" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
              border: "1px solid var(--border-default)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            <thead>
              <tr style={{ background: "var(--bg-subtle)" }}>
                {head.map((c, j) => (
                  <th
                    key={j}
                    style={{
                      padding: "9px 12px",
                      textAlign: tableAlign?.[j] ?? "left",
                      fontWeight: 700,
                      borderBottom: "2px solid var(--border-default)",
                      borderRight:
                        j < head.length - 1 ? "1px solid var(--border-subtle)" : undefined,
                    }}
                  >
                    {formatInline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rest.map((row, r) => (
                <tr key={r} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {row.map((c, j) => (
                    <td
                      key={j}
                      style={{
                        padding: "8px 12px",
                        textAlign: tableAlign?.[j] ?? "left",
                        borderRight:
                          j < row.length - 1 ? "1px solid var(--border-subtle)" : undefined,
                      }}
                    >
                      {formatInline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      tableRows = null
      tableAlign = null
    }
  }

  const flushQuote = (idx: number) => {
    if (blockquoteLines.length > 0) {
      const joined = blockquoteLines.join(" ").trim()
      const callout = detectCallout(joined)
      elements.push(<Callout key={`q-${idx}`} kind={callout.kind} text={callout.text} />)
      blockquoteLines = []
    }
  }

  const flushAll = (i: number) => {
    flushList(i)
    flushTable(i)
    flushQuote(i)
  }

  const parseTableRow = (s: string): string[] =>
    s.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())

  lines.forEach((raw, i) => {
    const line = raw.trimEnd()

    const slotMatch = line.match(/<!--\s*IMAGE_SLOT_(\d+)\s*:\s*(.*?)\s*-->/)
    if (slotMatch) {
      flushAll(i)
      if (generatingImages) {
        elements.push(
          <ImageSkeleton key={i} label={`IMAGE_SLOT_${slotMatch[1]}`} hint={slotMatch[2]} />
        )
      } else {
        elements.push(
          <div
            key={i}
            style={{
              border: "1px dashed var(--brand-300)",
              borderRadius: 10,
              padding: "24px 16px",
              textAlign: "center",
              background: "var(--brand-50)",
              margin: "14px 0",
              color: "var(--brand-700)",
              fontSize: 12.5,
            }}
          >
            🖼 IMAGE_SLOT_{slotMatch[1]} · {slotMatch[2]}
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
              상단 <b>🖼 이미지 생성</b> 버튼을 누르면 실제 이미지로 바뀝니다
            </div>
          </div>
        )
      }
      return
    }

    const imgMatch = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/)
    if (imgMatch) {
      flushAll(i)
      elements.push(<AiImage key={i} src={imgMatch[2]} alt={imgMatch[1]} />)
      return
    }

    if (line.trim().startsWith("|") && line.includes("|")) {
      flushList(i)
      flushQuote(i)
      const row = parseTableRow(line.trim())
      const isAlign = row.every((c) => /^:?-+:?$/.test(c))
      if (isAlign) {
        tableAlign = row.map((c) => {
          if (c.startsWith(":") && c.endsWith(":")) return "center"
          if (c.endsWith(":")) return "right"
          return "left"
        })
      } else {
        if (!tableRows) tableRows = []
        tableRows.push(row)
      }
      return
    }

    if (line.startsWith("> ")) {
      flushList(i)
      flushTable(i)
      blockquoteLines.push(line.slice(2))
      return
    }

    if (line.trim() === "---" || line.trim() === "***") {
      flushAll(i)
      elements.push(
        <hr
          key={i}
          style={{ border: 0, borderTop: "1px solid var(--border-subtle)", margin: "20px 0" }}
        />
      )
      return
    }

    if (/^[-*]\s*\[[ xX]\]/.test(line)) {
      flushTable(i)
      flushQuote(i)
      if (listKind !== "checklist" && listItems.length > 0) flushList(i)
      listKind = "checklist"
      listItems.push(line.replace(/^[-*]\s*/, ""))
      return
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushTable(i)
      flushQuote(i)
      if (listKind !== "ul" && listItems.length > 0) flushList(i)
      listKind = "ul"
      listItems.push(line.slice(2))
      return
    }

    if (line.startsWith("### ")) {
      flushAll(i)
      elements.push(
        <h3 key={i} style={{ fontSize: 15, fontWeight: 700, marginTop: 18, marginBottom: 8 }}>
          {formatInline(line.slice(4))}
        </h3>
      )
      return
    }
    if (line.startsWith("## ")) {
      flushAll(i)
      elements.push(
        <h2
          key={i}
          style={{
            fontSize: 18,
            fontWeight: 700,
            marginTop: 24,
            marginBottom: 10,
            letterSpacing: "-.01em",
          }}
        >
          {formatInline(line.slice(3))}
        </h2>
      )
      return
    }
    if (line.trim() === "") {
      flushAll(i)
      return
    }
    flushAll(i)
    elements.push(
      <p key={i} style={{ marginBottom: 10, color: "var(--text-secondary)", lineHeight: 1.7 }}>
        {formatInline(line)}
      </p>
    )
  })
  flushAll(lines.length)
  return <>{elements}</>
}

/* ─── 시각 요소 ─── */

export function AiImage({
  src,
  alt,
  hero,
}: {
  src: string
  alt: string
  hero?: boolean
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        margin: hero ? "0 0 16px" : "14px 0",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={{
          width: "100%",
          aspectRatio: "16 / 9",
          objectFit: "cover",
          borderRadius: 12,
          display: "block",
        }}
      />
      <span
        style={{
          position: "absolute",
          right: 8,
          bottom: 8,
          width: 22,
          height: 22,
          display: "grid",
          placeItems: "center",
          background: "rgba(255, 255, 255, 0.92)",
          borderRadius: "50%",
          boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
          backdropFilter: "blur(4px)",
          pointerEvents: "none",
          padding: 3,
        }}
        aria-label="AI generated by Gemini"
      >
        <GeminiMark size={16} />
      </span>
      {alt && !hero && (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            textAlign: "center",
            marginTop: 6,
            fontStyle: "italic",
          }}
        >
          {alt}
        </div>
      )}
    </div>
  )
}

export function GeminiMark({ size = 16 }: { size?: number }) {
  const [failed, setFailed] = React.useState(false)
  if (failed) {
    /* PNG 미배치 시 SVG fallback (4-point sparkle, multi-color gradient) */
    const id = `gm-fb-${size}`
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#4285F4" />
            <stop offset="35%"  stopColor="#9B72CB" />
            <stop offset="70%"  stopColor="#D96570" />
            <stop offset="100%" stopColor="#F9AB00" />
          </linearGradient>
        </defs>
        <path
          d="M12 1 C 12 1, 13 9, 23 12 C 13 15, 12 23, 12 23 C 12 23, 11 15, 1 12 C 11 9, 12 1, 12 1 Z"
          fill={`url(#${id})`}
        />
      </svg>
    )
  }
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/gemini-mark.png"
      alt="Gemini"
      width={size}
      height={size}
      style={{ display: "block", objectFit: "contain" }}
      onError={() => setFailed(true)}
    />
  )
}

export function ImageSkeleton({
  label,
  hint,
  hero,
}: {
  label: string
  hint?: string
  hero?: boolean
}) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16 / 9",
        margin: hero ? "0 0 16px" : "14px 0",
        borderRadius: 12,
        overflow: "hidden",
        background:
          "linear-gradient(90deg, #eef0ff 0%, #f5f3ff 25%, #fdf4ff 50%, #f5f3ff 75%, #eef0ff 100%)",
        backgroundSize: "200% 100%",
        animation: "skeleton-slide 1.6s ease-in-out infinite",
        display: "grid",
        placeItems: "center",
        border: "1px solid var(--brand-200)",
      }}
    >
      <div style={{ textAlign: "center", color: "var(--brand-700)" }}>
        <div style={{ fontSize: 28, marginBottom: 6, animation: "skeleton-pulse 1.4s ease-in-out infinite" }}>
          🎨
        </div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>AI가 그리는 중…</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          {label}
          {hint ? ` · ${hint}` : ""}
        </div>
      </div>
      <style jsx>{`
        @keyframes skeleton-slide {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        @keyframes skeleton-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}

function detectCallout(s: string): {
  kind: "tip" | "warn" | "info" | "ok" | "quote"
  text: string
} {
  if (/^(💡|\*\*(팁|Tip)\*\*|팁:)/.test(s)) return { kind: "tip", text: s.replace(/^💡\s*/, "") }
  if (/^(⚠️|❌|\*\*(주의|경고)\*\*|주의:|경고:)/.test(s)) return { kind: "warn", text: s.replace(/^⚠️\s*|^❌\s*/, "") }
  if (/^(ℹ️|\*\*정보\*\*|정보:)/.test(s)) return { kind: "info", text: s.replace(/^ℹ️\s*/, "") }
  if (/^(✅|\*\*체크\*\*|요약:)/.test(s)) return { kind: "ok", text: s.replace(/^✅\s*/, "") }
  return { kind: "quote", text: s }
}

function Callout({
  kind,
  text,
}: {
  kind: "tip" | "warn" | "info" | "ok" | "quote"
  text: string
}) {
  const palette: Record<typeof kind, { bg: string; border: string; fg: string; icon: string }> = {
    tip:   { bg: "#fffbeb", border: "#fde68a", fg: "#92400e", icon: "💡" },
    warn:  { bg: "#fef2f2", border: "#fecaca", fg: "#991b1b", icon: "⚠️" },
    info:  { bg: "#eff6ff", border: "#bfdbfe", fg: "#1e40af", icon: "ℹ️" },
    ok:    { bg: "#ecfdf5", border: "#a7f3d0", fg: "#065f46", icon: "✅" },
    quote: { bg: "#f9fafb", border: "#e5e7eb", fg: "#374151", icon: "" },
  }
  const p = palette[kind]
  return (
    <div
      style={{
        padding: "12px 14px",
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderLeft: `4px solid ${p.fg}`,
        borderRadius: 6,
        margin: "12px 0",
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        color: p.fg,
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {p.icon && <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{p.icon}</span>}
      <div style={{ flex: 1 }}>{formatInline(text)}</div>
    </div>
  )
}

function formatInline(s: string): React.ReactNode {
  /* **bold** */
  const parts: React.ReactNode[] = []
  let rest = s
  let key = 0
  const boldRe = /\*\*(.+?)\*\*/
  while (true) {
    const m = rest.match(boldRe)
    if (!m) {
      parts.push(formatLinks(rest, key))
      break
    }
    const idx = rest.indexOf(m[0])
    if (idx > 0) parts.push(formatLinks(rest.slice(0, idx), key++))
    parts.push(
      <b key={`b${key++}`} style={{ fontWeight: 700, color: "var(--text-primary)" }}>
        {m[1]}
      </b>
    )
    rest = rest.slice(idx + m[0].length)
  }
  return parts
}

function formatLinks(s: string, baseKey: number): React.ReactNode {
  /* `code` & [text](url) */
  const out: React.ReactNode[] = []
  let rest = s
  let key = 0
  const re = /(`([^`]+)`|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/
  while (true) {
    const m = rest.match(re)
    if (!m) {
      out.push(rest)
      break
    }
    const idx = rest.indexOf(m[0])
    if (idx > 0) out.push(rest.slice(0, idx))
    if (m[2]) {
      out.push(
        <code
          key={`c${baseKey}-${key++}`}
          style={{
            background: "var(--bg-muted)",
            padding: "1px 5px",
            borderRadius: 4,
            fontSize: 12,
            fontFamily: "ui-monospace, monospace",
          }}
        >
          {m[2]}
        </code>
      )
    } else if (m[3] && m[4]) {
      out.push(
        <a
          key={`l${baseKey}-${key++}`}
          href={m[4]}
          target="_blank"
          rel="noreferrer"
          style={{ color: "var(--brand-600)", textDecoration: "underline" }}
        >
          {m[3]}
        </a>
      )
    }
    rest = rest.slice(idx + m[0].length)
  }
  return out
}
