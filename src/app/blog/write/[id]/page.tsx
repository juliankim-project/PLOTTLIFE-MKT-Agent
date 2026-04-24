"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Icon, PageHeader } from "../../_ui"

interface OutlineSection {
  heading: string
  level: 2 | 3
  bullets?: string[]
  est_words?: number
}

interface Topic {
  id: string
  title: string
  primary_keyword: string | null
  secondary_keywords: string[] | null
  target_kpi: string | null
  tone_guide: string | null
  outline: OutlineSection[] | null
  cta_hints: string[] | null
}

interface Draft {
  id: string
  topic_id: string | null
  title: string
  body_markdown: string | null
  hero_image_url?: string | null
  status: string
  progress_pct: number | null
  metadata: {
    provider?: string
    model?: string
    generated_at?: string
  } | null
  topic?: Topic | null
}

async function safeFetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const r = await fetch(input, init)
  const text = await r.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(r.ok ? "응답 파싱 실패" : `HTTP ${r.status}`)
  }
}

export default function WriteEditor() {
  const params = useParams<{ id: string }>()
  const topicId = params.id
  const router = useRouter()

  const [topic, setTopic] = useState<Topic | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [body, setBody] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<"idle" | "writing" | "done">("idle")
  const [progress, setProgress] = useState(0)
  const [generatingImages, setGeneratingImages] = useState(false)
  const [quality, setQuality] = useState<"flash" | "pro">("flash")

  /** topic 로드 + 기존 draft 가 있는지 체크 */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const t = await safeFetchJson<{ ok: boolean; topic?: Topic; error?: string }>(`/api/topics/${topicId}`)
      if (!t.ok || !t.topic) throw new Error(t.error ?? "topic 조회 실패")
      setTopic(t.topic)

      const dList = await safeFetchJson<{ ok: boolean; drafts?: Draft[] }>(
        `/api/drafts?topicId=${topicId}&limit=1`
      )
      const existing = dList.drafts?.[0]
      if (existing) {
        const full = await safeFetchJson<{ ok: boolean; draft?: Draft }>(`/api/drafts/${existing.id}`)
        if (full.ok && full.draft) {
          setDraft(full.draft)
          setBody(full.draft.body_markdown ?? "")
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류")
    } finally {
      setLoading(false)
    }
  }, [topicId])

  useEffect(() => {
    load()
  }, [load])

  /** 본문 생성 */
  const handleWrite = async () => {
    setGenerating(true)
    setError(null)
    setPhase("writing")
    setProgress(5)
    const timer = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 92))
    }, 1500)
    try {
      const j = await safeFetchJson<{
        ok: boolean
        result?: { draft: Draft; charCount: number; durationMs: number; provider: string; model: string }
        error?: string
      }>("/api/drafts/write", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topicId, quality }),
      })
      if (!j.ok || !j.result) throw new Error(j.error ?? "작성 실패")
      setDraft(j.result.draft)
      setBody(j.result.draft.body_markdown ?? "")
      setProgress(100)
      setPhase("done")
      setTimeout(() => {
        setPhase("idle")
        setProgress(0)
      }, 1500)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "작성 실패"
      setError(
        msg.includes("504") || msg.includes("timeout") || msg.includes("JSON") || msg.includes("파싱")
          ? "Gemini 응답이 너무 오래 걸렸어요. 1분 뒤 다시 시도해 주세요."
          : msg
      )
      setPhase("idle")
      setProgress(0)
    } finally {
      setGenerating(false)
      clearInterval(timer)
    }
  }

  /** 이미지 생성 — 썸네일 + 본문 IMAGE_SLOT 치환 */
  const handleGenerateImages = async () => {
    if (!draft) return
    setGeneratingImages(true)
    setError(null)
    try {
      const j = await safeFetchJson<{
        ok: boolean
        result?: { heroUrl: string | null; replacedSlots: number }
        error?: string
      }>(`/api/drafts/${draft.id}/images`, { method: "POST" })
      if (!j.ok) throw new Error(j.error ?? "이미지 생성 실패")
      // draft 재로드 → 최신 body + hero url
      const full = await safeFetchJson<{ ok: boolean; draft?: Draft }>(`/api/drafts/${draft.id}`)
      if (full.ok && full.draft) {
        setDraft(full.draft)
        setBody(full.draft.body_markdown ?? "")
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "이미지 생성 실패"
      setError(
        msg.includes("quota") || msg.includes("429")
          ? "Gemini Image 무료 quota 초과 — 내일 다시 시도하거나 Google Cloud 결제 활성화 필요해요."
          : msg
      )
    } finally {
      setGeneratingImages(false)
    }
  }

  /** 본문 저장 */
  const save = async () => {
    if (!draft) return
    setSaving(true)
    try {
      await fetch(`/api/drafts/${draft.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body_markdown: body }),
      })
      setSavedAt(new Date().toLocaleTimeString("ko-KR"))
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패")
    } finally {
      setSaving(false)
    }
  }

  const charCount = useMemo(() => body.replace(/\s/g, "").length, [body])

  const phaseLabel: Record<typeof phase, string> = {
    idle: "",
    writing: "Copywriter 가 플라트 블로그 스타일로 본문 작성 중…",
    done: "완료!",
  }

  if (loading) {
    return (
      <div className="bpage">
        <div style={{ padding: "60px 20px", textAlign: "center", color: "var(--text-muted)" }}>
          브리프를 불러오는 중…
        </div>
      </div>
    )
  }

  if (!topic) {
    return (
      <div className="bpage">
        <div style={{ padding: "60px 20px", textAlign: "center" }}>
          <p>주제를 찾을 수 없어요.</p>
          <Link href="/blog/write" className="bbtn bbtn--primary bbtn--sm">
            작성 목록으로
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 04 · CREATE"
        title={topic.title}
        sub={`Copywriter 에이전트가 브리프 기반으로 플라트라이프 블로그 스타일(친근한 구어체, 훅→문제→비교→Step→CTA)로 본문을 작성합니다.`}
        actions={[
          { label: "← 콘텐츠 제작 목록", onClick: () => router.push("/blog/write") },
          { label: "검수로 →", primary: true, onClick: () => router.push("/blog/review") },
        ]}
      />

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            background: "var(--danger-bg)",
            border: "1px solid var(--danger-border)",
            color: "var(--danger-fg)",
            borderRadius: "var(--r-md)",
            fontSize: 13,
            display: "flex",
            gap: 8,
          }}
        >
          ⚠️ <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ color: "var(--danger-fg)" }}>✕</button>
        </div>
      )}

      <div className="write-grid">
        {/* CENTER: 에디터 */}
        <div className="bcard">
          <div className="bcard__header">
            <div>
              <div className="bcard__title">본문 에디터 (Markdown)</div>
              <div className="bcard__sub">
                {charCount > 0 ? `${charCount.toLocaleString()}자 (공백 제외)` : "본문 없음"}
                {draft?.metadata?.model && (
                  <span style={{ marginLeft: 8 }}>
                    · {draft.metadata.provider}/{draft.metadata.model}
                  </span>
                )}
                {savedAt && <span style={{ marginLeft: 8, color: "var(--success-fg)" }}>✓ {savedAt} 저장</span>}
              </div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
              <div
                role="group"
                aria-label="품질 모드"
                style={{
                  display: "inline-flex",
                  background: "white",
                  border: "1px solid var(--border-default)",
                  borderRadius: 999,
                  padding: 2,
                  marginRight: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setQuality("flash")}
                  title="Gemini 2.5 Flash — 빠르고 저렴 (기본)"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 10px",
                    border: 0,
                    background: quality === "flash" ? "var(--brand-600)" : "transparent",
                    color: quality === "flash" ? "white" : "var(--text-secondary)",
                    borderRadius: 999,
                    cursor: "pointer",
                  }}
                >
                  💨 Flash
                </button>
                <button
                  type="button"
                  onClick={() => setQuality("pro")}
                  title="Gemini 2.5 Pro — 느리지만 최고 품질"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 10px",
                    border: 0,
                    background: quality === "pro" ? "var(--brand-600)" : "transparent",
                    color: quality === "pro" ? "white" : "var(--text-secondary)",
                    borderRadius: 999,
                    cursor: "pointer",
                  }}
                >
                  🧠 Pro
                </button>
              </div>
              {draft && (
                <button className="bbtn bbtn--ghost bbtn--sm" onClick={save} disabled={saving}>
                  {saving ? "저장 중…" : "💾 저장"}
                </button>
              )}
              {draft && (
                <button
                  className="bbtn bbtn--ghost bbtn--sm"
                  onClick={handleGenerateImages}
                  disabled={generatingImages}
                  title="썸네일 + 본문 IMAGE_SLOT 을 실제 이미지로 생성"
                >
                  {generatingImages ? (
                    <>
                      <Spinner /> 이미지 생성 중…
                    </>
                  ) : (
                    <>🖼 이미지 생성</>
                  )}
                </button>
              )}
              <button
                className="bbtn bbtn--primary bbtn--sm"
                onClick={handleWrite}
                disabled={generating}
                title={draft ? "현재 본문을 덮어쓰고 다시 작성" : "Copywriter 로 본문 작성"}
              >
                {generating ? (
                  <>
                    <Spinner /> 작성 중…
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" size={12} /> {draft ? "다시 작성" : "본문 작성"}
                  </>
                )}
              </button>
            </div>
          </div>

          {phase === "writing" && (
            <div style={{ padding: "12px 20px", background: "var(--brand-50)" }}>
              <div className="bar-track" style={{ height: 4 }}>
                <div
                  className="bar-fill"
                  style={{ width: `${progress}%`, transition: "width 1.2s linear" }}
                />
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: "var(--brand-700)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{phaseLabel[phase]}</span>
                <span className="text-mono">{progress}%</span>
              </div>
            </div>
          )}

          {body ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "70vh", minHeight: 520 }}>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Markdown 본문"
                style={{
                  padding: "20px 24px",
                  border: "none",
                  borderRight: "1px solid var(--border-subtle)",
                  outline: "none",
                  resize: "none",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  background: "var(--bg-subtle)",
                  color: "var(--text-primary)",
                }}
              />
              <div
                style={{
                  padding: "20px 24px",
                  overflowY: "auto",
                  fontSize: 14,
                  lineHeight: 1.8,
                  background: "white",
                }}
              >
                <MarkdownPreview
                  body={body}
                  title={topic.title}
                  heroUrl={draft?.hero_image_url}
                  generatingImages={generatingImages}
                />
              </div>
            </div>
          ) : (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10, opacity: 0.5 }}>✨</div>
              아직 본문이 없어요.
              <br />
              우상단 <b style={{ color: "var(--brand-600)" }}>본문 작성</b> 버튼으로 시작하세요.
              <br />
              <br />
              <span style={{ fontSize: 11 }}>
                Copywriter 가 아웃라인을 따라 플라트 스타일로 3,000~4,000자 작성 (약 30~60초 소요)
              </span>
            </div>
          )}
        </div>

        {/* RIGHT: 브리프 사이드 */}
        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">브리프</div>
            <Link href={`/blog/topics`} className="bbtn bbtn--ghost bbtn--sm" style={{ marginLeft: "auto" }}>
              편집
            </Link>
          </div>
          <div style={{ padding: 16, fontSize: 12, lineHeight: 1.6 }}>
            <SideField label="Primary 키워드">
              <span className="bchip bchip--brand">{topic.primary_keyword}</span>
            </SideField>
            {topic.secondary_keywords && topic.secondary_keywords.length > 0 && (
              <SideField label="Secondary">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {topic.secondary_keywords.map((k) => (
                    <span key={k} className="bchip" style={{ fontSize: 10.5 }}>
                      {k}
                    </span>
                  ))}
                </div>
              </SideField>
            )}
            <SideField label="타겟 KPI">{topic.target_kpi}</SideField>
            {topic.tone_guide && <SideField label="톤 가이드">{topic.tone_guide}</SideField>}
            {topic.outline && topic.outline.length > 0 && (
              <SideField label="아웃라인">
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                  {topic.outline.map((o, i) => (
                    <li
                      key={i}
                      style={{
                        paddingLeft: o.level === 3 ? 14 : 0,
                        marginBottom: 4,
                        fontSize: 11.5,
                      }}
                    >
                      <span
                        className="text-mono"
                        style={{
                          fontSize: 9,
                          background: "var(--brand-50)",
                          color: "var(--brand-700)",
                          padding: "1px 4px",
                          borderRadius: 2,
                          marginRight: 6,
                        }}
                      >
                        H{o.level}
                      </span>
                      {o.heading}
                    </li>
                  ))}
                </ul>
              </SideField>
            )}
            {topic.cta_hints && topic.cta_hints.length > 0 && (
              <SideField label="CTA 포인트">
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {topic.cta_hints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </SideField>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .blog-shell .write-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 14px;
          align-items: start;
        }
        @media (max-width: 1180px) {
          .blog-shell .write-grid { grid-template-columns: 1fr; }
        }
        @keyframes write-spin { to { transform: rotate(360deg); } }
        .blog-shell .write-spinner {
          display: inline-block;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: write-spin 0.8s linear infinite;
          width: 12px; height: 12px;
          margin-right: 4px;
        }
      `}</style>
    </div>
  )
}

function SideField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          fontSize: 10,
          color: "var(--text-muted)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: ".04em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Spinner() {
  return <span className="write-spinner" />
}

/**
 * Markdown 미리보기 — 본문 시각 요소 지원.
 * - H1~H3, **bold**, `code`, [link](url)
 * - 리스트(- / *), 체크리스트(- [ ])
 * - 이미지 ![alt](url) + AI 워터마크 오버레이
 * - IMAGE_SLOT 플레이스홀더 + 생성 중 스켈레톤
 * - 테이블 (| col | col |)
 * - 블록쿼트 (>) · 콜아웃 (> 💡/⚠️/ℹ️/✅)
 * - 구분선 (---)
 */
function MarkdownPreview({
  body,
  title,
  heroUrl,
  generatingImages = false,
}: {
  body: string
  title: string
  heroUrl?: string | null
  generatingImages?: boolean
}) {
  const lines = body.split("\n")
  const elements: React.ReactNode[] = []

  /* Hero image 영역 */
  if (heroUrl) {
    elements.push(<AiImage key="hero" src={heroUrl} alt={title} hero />)
  } else if (generatingImages) {
    elements.push(<ImageSkeleton key="hero-gen" hero label="썸네일" />)
  }

  elements.push(
    <h1 key="t" style={{ fontSize: 24, fontWeight: 800, marginBottom: 16, letterSpacing: "-.02em" }}>
      {title}
    </h1>
  )

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
                  <span style={{ flex: 1, color: "var(--text-secondary)", textDecoration: checked ? "line-through" : "none" }}>
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
                      borderRight: j < head.length - 1 ? "1px solid var(--border-subtle)" : undefined,
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
                        borderRight: j < row.length - 1 ? "1px solid var(--border-subtle)" : undefined,
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
    s
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim())

  lines.forEach((raw, i) => {
    const line = raw.trimEnd()

    // IMAGE_SLOT 주석
    const slotMatch = line.match(/<!--\s*IMAGE_SLOT_(\d+)\s*:\s*(.*?)\s*-->/)
    if (slotMatch) {
      flushAll(i)
      if (generatingImages) {
        elements.push(
          <ImageSkeleton
            key={i}
            label={`IMAGE_SLOT_${slotMatch[1]}`}
            hint={slotMatch[2]}
          />
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

    // ![alt](url) 단독 라인
    const imgMatch = line.match(/^!\[([^\]]*)\]\((https?:\/\/[^)]+)\)$/)
    if (imgMatch) {
      flushAll(i)
      elements.push(<AiImage key={i} src={imgMatch[2]} alt={imgMatch[1]} />)
      return
    }

    // 테이블 — 라인이 | 로 시작하면 수집
    if (line.trim().startsWith("|") && line.includes("|")) {
      flushList(i)
      flushQuote(i)
      const row = parseTableRow(line.trim())
      // 정렬 헤더 (| --- | :---: | ---: |)
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

    // 블록쿼트 / 콜아웃 — >
    if (line.startsWith("> ")) {
      flushList(i)
      flushTable(i)
      blockquoteLines.push(line.slice(2))
      return
    }

    // 구분선
    if (line.trim() === "---" || line.trim() === "***") {
      flushAll(i)
      elements.push(
        <hr
          key={i}
          style={{
            border: 0,
            borderTop: "1px solid var(--border-subtle)",
            margin: "20px 0",
          }}
        />
      )
      return
    }

    // 체크리스트 (- [x] / - [ ])
    if (/^[-*]\s*\[[ xX]\]/.test(line)) {
      flushTable(i)
      flushQuote(i)
      if (listKind !== "checklist" && listItems.length > 0) flushList(i)
      listKind = "checklist"
      listItems.push(line.replace(/^[-*]\s*/, ""))
      return
    }

    // 일반 리스트
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
      <p key={i} style={{ marginBottom: 10, color: "var(--text-secondary)" }}>
        {formatInline(line)}
      </p>
    )
  })
  flushAll(lines.length)
  return <>{elements}</>
}

/* ─── 시각 요소 컴포넌트 ─── */

function AiImage({
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
          width: 24,
          height: 24,
          display: "grid",
          placeItems: "center",
          background: "rgba(255, 255, 255, 0.88)",
          borderRadius: "50%",
          boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
          backdropFilter: "blur(4px)",
          pointerEvents: "none",
        }}
        aria-label="AI generated by Gemini"
      >
        <GeminiMark size={14} />
      </span>
    </div>
  )
}

function GeminiMark({ size = 14 }: { size?: number }) {
  /* 4-point sparkle star with Gemini-style multi-color gradient */
  const id = "gm-" + size
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#4285F4" />
          <stop offset="35%"  stopColor="#9B72CB" />
          <stop offset="70%"  stopColor="#D96570" />
          <stop offset="100%" stopColor="#F9AB00" />
        </linearGradient>
      </defs>
      <path
        d="M12 1 L14 10 L23 12 L14 14 L12 23 L10 14 L1 12 L10 10 Z"
        fill={`url(#${id})`}
      />
    </svg>
  )
}

function ImageSkeleton({
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

function detectCallout(s: string): { kind: "tip" | "warn" | "info" | "ok" | "quote"; text: string } {
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
  const palette: Record<typeof kind, { bg: string; border: string; fg: string; icon: string; label: string }> = {
    tip:   { bg: "#fffbeb", border: "#fde68a", fg: "#92400e", icon: "💡", label: "팁" },
    warn:  { bg: "#fef2f2", border: "#fecaca", fg: "#991b1b", icon: "⚠️", label: "주의" },
    info:  { bg: "#eff6ff", border: "#bfdbfe", fg: "#1e40af", icon: "ℹ️", label: "정보" },
    ok:    { bg: "#ecfdf5", border: "#a7f3d0", fg: "#065f46", icon: "✅", label: "체크" },
    quote: { bg: "#f9fafb", border: "#e5e7eb", fg: "#374151", icon: "",   label: "" },
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
  // **bold**
  const parts: React.ReactNode[] = []
  let rest = s
  let key = 0
  const boldRe = /\*\*(.+?)\*\*/
  while (true) {
    const m = rest.match(boldRe)
    if (!m) {
      parts.push(rest)
      break
    }
    const idx = rest.indexOf(m[0])
    if (idx > 0) parts.push(rest.slice(0, idx))
    parts.push(
      <b key={`b${key++}`} style={{ fontWeight: 700, color: "var(--text-primary)" }}>
        {m[1]}
      </b>
    )
    rest = rest.slice(idx + m[0].length)
  }
  return parts
}
