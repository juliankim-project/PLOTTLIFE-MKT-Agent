"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Icon, PageHeader } from "../../_ui"

interface Draft {
  id: string
  title: string
  body_markdown: string | null
  hero_image_url: string | null
  status: string
  progress_pct: number | null
  primary_keyword: string | null
  updated_at: string
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

export default function ContentsEditor() {
  const params = useParams<{ id: string }>()
  const draftId = params.id
  const router = useRouter()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const j = await safeFetchJson<{ ok: boolean; draft?: Draft; error?: string }>(
        `/api/drafts/${draftId}`,
        { cache: "no-store" }
      )
      if (!j.ok || !j.draft) throw new Error(j.error ?? "draft 조회 실패")
      setDraft(j.draft)
      setTitle(j.draft.title)
      setBody(j.draft.body_markdown ?? "")
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류")
    } finally {
      setLoading(false)
    }
  }, [draftId])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (!draftId) return
    setSaving(true)
    setError(null)
    try {
      const j = await safeFetchJson<{ ok: boolean; draft?: Draft; error?: string }>(
        `/api/drafts/${draftId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, body_markdown: body }),
        }
      )
      if (!j.ok) throw new Error(j.error ?? "저장 실패")
      if (j.draft) setDraft(j.draft)
      setSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }))
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패")
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    if (!draftId) return
    setSaving(true)
    setError(null)
    try {
      // 내용도 함께 저장
      await safeFetchJson<{ ok: boolean }>(
        `/api/drafts/${draftId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ title, body_markdown: body, status: "published" }),
        }
      )
      router.push("/blog/contents")
    } catch (e) {
      setError(e instanceof Error ? e.message : "발행 실패")
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bpage">
        <div style={{ padding: "60px 0", textAlign: "center", color: "var(--text-muted)" }}>
          불러오는 중…
        </div>
      </div>
    )
  }

  if (!draft) {
    return (
      <div className="bpage">
        <PageHeader eyebrow="콘텐츠 관리" title="찾을 수 없음" />
        <div style={{ padding: 20 }}>
          해당 콘텐츠를 찾을 수 없어요.{" "}
          <button className="bbtn" onClick={() => router.push("/blog/contents")}>
            목록으로
          </button>
        </div>
      </div>
    )
  }

  const wordCount = body.trim().length
  const charNoSpace = body.replace(/\s/g, "").length
  const isPublished = draft.status === "published"

  const statusLabel =
    draft.status === "published"
      ? "발행완료"
      : draft.status === "scheduled"
      ? "발행예정"
      : "저장됨"

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow={`콘텐츠 편집 · ${statusLabel}`}
        title={title || "(제목 없음)"}
        sub={
          draft.primary_keyword
            ? `🎯 ${draft.primary_keyword} · 마지막 수정 ${new Date(draft.updated_at).toLocaleString("ko-KR")}`
            : `마지막 수정 ${new Date(draft.updated_at).toLocaleString("ko-KR")}`
        }
        actions={[
          { label: "← 목록", onClick: () => router.push("/blog/contents") },
          {
            label: saving ? "저장 중…" : "💾 저장",
            onClick: save,
          },
          ...(isPublished
            ? []
            : [
                {
                  label: "🚀 발행",
                  primary: true,
                  onClick: publish,
                },
              ]),
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
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {savedAt && (
        <div
          style={{
            marginBottom: 12,
            padding: "6px 12px",
            background: "var(--success-bg)",
            border: "1px solid var(--success-border)",
            color: "var(--success-fg)",
            borderRadius: "var(--r-md)",
            fontSize: 12,
            display: "inline-block",
          }}
        >
          ✓ {savedAt} 저장됨
        </div>
      )}

      {/* 제목 편집 */}
      <div className="bcard" style={{ marginBottom: 14 }}>
        <div style={{ padding: 16 }}>
          <label
            style={{
              fontSize: 11,
              color: "var(--text-muted)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: ".05em",
              display: "block",
              marginBottom: 6,
            }}
          >
            제목
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="콘텐츠 제목"
            style={{
              width: "100%",
              padding: "10px 14px",
              fontSize: 16,
              fontWeight: 600,
              border: "1px solid var(--border-default)",
              borderRadius: "var(--r-md)",
              outline: "none",
              background: "var(--bg-surface)",
            }}
          />
        </div>
      </div>

      {/* 에디터 / 미리보기 */}
      <div className="bcard">
        <div className="bcard__header">
          <div>
            <div className="bcard__title">본문 (Markdown)</div>
            <div className="bcard__sub">
              {wordCount}자 · 공백 제외 {charNoSpace}자
            </div>
          </div>
          {draft.hero_image_url && (
            <span
              className="bchip"
              style={{ marginLeft: "auto", fontSize: 10.5 }}
              title={draft.hero_image_url}
            >
              🖼 썸네일 있음
            </span>
          )}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 0,
            borderTop: "1px solid var(--border-subtle)",
          }}
        >
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Markdown 본문…"
            style={{
              padding: 20,
              border: 0,
              borderRight: "1px solid var(--border-subtle)",
              fontSize: 13,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              lineHeight: 1.6,
              minHeight: 600,
              resize: "vertical",
              outline: "none",
              background: "var(--bg-surface)",
            }}
          />
          <div
            style={{
              padding: 20,
              minHeight: 600,
              fontSize: 13,
              lineHeight: 1.7,
              background: "var(--bg-subtle)",
              overflow: "auto",
            }}
          >
            <MarkdownPreview source={body} heroImage={draft.hero_image_url ?? undefined} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── 간단한 Markdown 미리보기 (외부 라이브러리 없이 최소 파싱) ── */
function MarkdownPreview({
  source,
  heroImage,
}: {
  source: string
  heroImage?: string
}) {
  const lines = source.split("\n")
  const elements: React.ReactNode[] = []
  let key = 0
  let paragraph: string[] = []

  const flushPara = () => {
    if (paragraph.length > 0) {
      const text = paragraph.join(" ")
      elements.push(
        <p
          key={key++}
          style={{ margin: "0 0 12px", lineHeight: 1.7 }}
          dangerouslySetInnerHTML={{ __html: inlineMd(text) }}
        />
      )
      paragraph = []
    }
  }

  if (heroImage) {
    elements.push(
      <img
        key={key++}
        src={heroImage}
        alt=""
        style={{
          width: "100%",
          borderRadius: 8,
          marginBottom: 16,
          objectFit: "cover",
          maxHeight: 240,
        }}
      />
    )
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    const slotMatch = line.match(/<!--\s*IMAGE_SLOT_(\d+)\s*:\s*(.*?)\s*-->/)
    if (slotMatch) {
      flushPara()
      elements.push(
        <div
          key={key++}
          style={{
            padding: "12px 14px",
            background: "#fff8ed",
            border: "1px dashed #f59e0b",
            borderRadius: 6,
            margin: "12px 0",
            fontSize: 12,
            color: "#92400e",
          }}
        >
          🖼 IMAGE_SLOT_{slotMatch[1]} · {slotMatch[2]}
        </div>
      )
      continue
    }

    if (line.startsWith("### ")) {
      flushPara()
      elements.push(
        <h3 key={key++} style={{ fontSize: 15, fontWeight: 700, margin: "16px 0 6px" }}>
          {line.slice(4)}
        </h3>
      )
      continue
    }
    if (line.startsWith("## ")) {
      flushPara()
      elements.push(
        <h2 key={key++} style={{ fontSize: 17, fontWeight: 700, margin: "20px 0 8px", letterSpacing: "-.01em" }}>
          {line.slice(3)}
        </h2>
      )
      continue
    }
    if (line.startsWith("# ")) {
      flushPara()
      elements.push(
        <h1 key={key++} style={{ fontSize: 20, fontWeight: 800, margin: "24px 0 10px" }}>
          {line.slice(2)}
        </h1>
      )
      continue
    }
    if (line.startsWith("- ")) {
      flushPara()
      elements.push(
        <div
          key={key++}
          style={{ paddingLeft: 16, margin: "2px 0", position: "relative" }}
          dangerouslySetInnerHTML={{ __html: "• " + inlineMd(line.slice(2)) }}
        />
      )
      continue
    }
    if (line === "") {
      flushPara()
      continue
    }
    paragraph.push(line)
  }
  flushPara()
  return <>{elements}</>
}

function inlineMd(s: string): string {
  // ** bold **
  let out = s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
  // * italic *
  out = out.replace(/(^|\s)\*([^*]+)\*(?=\s|$)/g, "$1<i>$2</i>")
  // `code`
  out = out.replace(
    /`([^`]+)`/g,
    '<code style="background:var(--bg-muted);padding:1px 5px;border-radius:4px;font-size:12px;">$1</code>'
  )
  // [text](url)
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:var(--brand-600);text-decoration:underline">$1</a>')
  return out
}
