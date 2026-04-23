"use client"

/**
 * 경량 마크다운 렌더러 — 외부 의존성 없이 기본 마크다운 지원.
 * Mock 드래프트가 생성하는 포맷에 맞춰 h2/h3, p, ul/ol, table, blockquote, image, link, bold, strong, code 지원.
 * 실제 운영에서는 react-markdown + remark-gfm 쓰는 게 맞지만, 여기선 가볍게.
 */

import React from "react"

type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "h4"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "table"; headers: string[]; rows: string[][] }
  | { kind: "hr" }
  | { kind: "image"; alt: string; src: string }
  | { kind: "code"; text: string }

function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = []
  const lines = md.split("\n")
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // 빈 줄
    if (!line.trim()) {
      i++
      continue
    }

    // 구분선
    if (/^---+$/.test(line.trim())) {
      blocks.push({ kind: "hr" })
      i++
      continue
    }

    // 헤더
    if (line.startsWith("## ")) {
      blocks.push({ kind: "h2", text: line.slice(3).trim() })
      i++
      continue
    }
    if (line.startsWith("### ")) {
      blocks.push({ kind: "h3", text: line.slice(4).trim() })
      i++
      continue
    }
    if (line.startsWith("#### ")) {
      blocks.push({ kind: "h4", text: line.slice(5).trim() })
      i++
      continue
    }

    // 이미지 (단독 줄)
    const imgMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      blocks.push({ kind: "image", alt: imgMatch[1], src: imgMatch[2] })
      i++
      continue
    }

    // 테이블
    if (line.startsWith("|") && lines[i + 1]?.startsWith("|") && lines[i + 1]?.includes("---")) {
      const headers = line
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean)
      i += 2 // header + separator
      const rows: string[][] = []
      while (i < lines.length && lines[i].startsWith("|")) {
        const cells = lines[i]
          .split("|")
          .map((s) => s.trim())
          .filter((_, idx, arr) => idx !== 0 && idx !== arr.length - 1)
        rows.push(cells)
        i++
      }
      blocks.push({ kind: "table", headers, rows })
      continue
    }

    // 인용구
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [line.slice(2)]
      i++
      while (i < lines.length && lines[i].startsWith("> ")) {
        quoteLines.push(lines[i].slice(2))
        i++
      }
      blocks.push({ kind: "quote", text: quoteLines.join(" ") })
      continue
    }

    // 순서 없는 리스트
    if (/^[-*]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s/, ""))
        i++
      }
      blocks.push({ kind: "ul", items })
      continue
    }

    // 순서 있는 리스트
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""))
        i++
      }
      blocks.push({ kind: "ol", items })
      continue
    }

    // 일반 문단 — 다음 빈 줄까지
    const paraLines: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("#") &&
      !lines[i].startsWith("> ") &&
      !lines[i].startsWith("|") &&
      !/^[-*]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !lines[i].match(/^!\[/) &&
      !/^---+$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i])
      i++
    }
    blocks.push({ kind: "p", text: paraLines.join(" ") })
  }

  return blocks
}

// 인라인 포맷 파싱: **bold**, *italic*, `code`, [link](url), ![image](url)
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  const patterns = [
    {
      regex: /!\[([^\]]*)\]\(([^)]+)\)/,
      render: (m: RegExpMatchArray) => (
        <img
          key={key++}
          src={m[2]}
          alt={m[1]}
          className="my-2 inline-block rounded-md"
        />
      ),
    },
    {
      regex: /\[([^\]]+)\]\(([^)]+)\)/,
      render: (m: RegExpMatchArray) => (
        <a
          key={key++}
          href={m[2]}
          className="text-[#74594B] font-medium underline underline-offset-2 hover:text-[#3d2b1f]"
        >
          {m[1]}
        </a>
      ),
    },
    {
      regex: /\*\*([^*]+)\*\*/,
      render: (m: RegExpMatchArray) => (
        <strong key={key++} className="font-bold text-gray-900">
          {m[1]}
        </strong>
      ),
    },
    {
      regex: /\*([^*]+)\*/,
      render: (m: RegExpMatchArray) => (
        <em key={key++} className="italic">
          {m[1]}
        </em>
      ),
    },
    {
      regex: /`([^`]+)`/,
      render: (m: RegExpMatchArray) => (
        <code
          key={key++}
          className="rounded-[3px] bg-[#f5f0e5] px-1.5 py-[2px] font-mono text-[13px] text-[#74594B]"
        >
          {m[1]}
        </code>
      ),
    },
  ]

  while (remaining) {
    let earliest: { idx: number; len: number; node: React.ReactNode } | null = null
    for (const p of patterns) {
      const m = remaining.match(p.regex)
      if (m && m.index !== undefined) {
        if (earliest === null || m.index < earliest.idx) {
          earliest = { idx: m.index, len: m[0].length, node: p.render(m) }
        }
      }
    }
    if (!earliest) {
      parts.push(remaining)
      break
    }
    if (earliest.idx > 0) parts.push(remaining.slice(0, earliest.idx))
    parts.push(earliest.node)
    remaining = remaining.slice(earliest.idx + earliest.len)
  }

  return parts
}

export function MarkdownRenderer({ content }: { content: string }) {
  const blocks = parseMarkdown(content)

  return (
    <article className="space-y-6">
      {blocks.map((b, i) => {
        switch (b.kind) {
          case "h2":
            return (
              <h2
                key={i}
                className="mt-10 scroll-mt-20 text-[22px] font-bold tracking-tight text-gray-900"
              >
                {renderInline(b.text)}
              </h2>
            )
          case "h3":
            return (
              <h3 key={i} className="mt-6 text-xl font-semibold text-gray-900">
                {renderInline(b.text)}
              </h3>
            )
          case "h4":
            return (
              <h4 key={i} className="mt-4 text-lg font-medium text-gray-900">
                {renderInline(b.text)}
              </h4>
            )
          case "p":
            return (
              <p key={i} className="text-base leading-relaxed text-gray-700">
                {renderInline(b.text)}
              </p>
            )
          case "ul":
            return (
              <ul key={i} className="list-disc space-y-2 pl-6 text-base leading-relaxed text-gray-700">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ul>
            )
          case "ol":
            return (
              <ol key={i} className="list-decimal space-y-2 pl-6 text-base leading-relaxed text-gray-700">
                {b.items.map((it, j) => (
                  <li key={j}>{renderInline(it)}</li>
                ))}
              </ol>
            )
          case "quote":
            return (
              <blockquote
                key={i}
                className="border-l-4 border-[#74594B] bg-[#f5f0e5]/50 pl-4 pr-3 py-3 italic text-gray-700 rounded-r-md"
              >
                {renderInline(b.text)}
              </blockquote>
            )
          case "table":
            return (
              <div key={i} className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-[#f5f0e5]">
                    <tr>
                      {b.headers.map((h, j) => (
                        <th key={j} className="px-4 py-3 text-left font-semibold text-[#74594B]">
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {b.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, ci) => (
                          <td key={ci} className="px-4 py-3 text-gray-700">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case "hr":
            return <hr key={i} className="my-8 border-gray-200" />
          case "image":
            return (
              <figure key={i} className="my-6">
                <img
                  src={b.src}
                  alt={b.alt}
                  className="w-full rounded-xl border border-gray-100 shadow-sm"
                  style={{ boxShadow: "0 5px 20px 0 rgba(0,0,0,0.08)" }}
                />
                {b.alt && (
                  <figcaption className="mt-2 text-center text-[13px] text-gray-500">
                    {b.alt}
                  </figcaption>
                )}
              </figure>
            )
          case "code":
            return (
              <pre key={i} className="overflow-x-auto rounded-xl bg-gray-900 p-4 text-[13px] text-gray-100">
                <code>{b.text}</code>
              </pre>
            )
        }
      })}
    </article>
  )
}
