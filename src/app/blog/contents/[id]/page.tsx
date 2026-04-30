"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Icon, PageHeader } from "../../_ui"
import { MarkdownPreview } from "../../_ui/markdown-preview"

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
  const [copying, setCopying] = useState(false)
  const [copyMsg, setCopyMsg] = useState<string | null>(null)

  /** 어드민 Tiptap 에 붙여넣을 HTML 클립보드 복사 */
  const handleCopyHtml = async () => {
    if (!body) return
    setCopying(true)
    try {
      const { marked } = await import("marked")
      marked.use({ gfm: true, breaks: false })
      /* IMAGE_SLOT 주석 제거 (혹시 남아있으면) */
      const cleaned = body.replace(/<!--\s*IMAGE_SLOT_\d+\s*:[^>]*-->/g, "")
      const html = (marked.parse(cleaned, { async: false }) as string).trim()
      await navigator.clipboard.writeText(html)
      setCopyMsg("✅ 어드민용 HTML 복사됨 — Tiptap 에디터에 Ctrl+V (또는 ⌘+V) 로 붙여넣기")
      setTimeout(() => setCopyMsg(null), 5000)
    } catch (e) {
      setError(e instanceof Error ? e.message : "복사 실패")
    } finally {
      setCopying(false)
    }
  }

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
          { label: "← 목록", href: "/blog/contents" },
          {
            label: copying ? "변환 중…" : "📋 어드민용 HTML 복사",
            onClick: handleCopyHtml,
          },
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

      {copyMsg && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#047857",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {copyMsg}
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
            <MarkdownPreview body={body} heroUrl={draft.hero_image_url} />
          </div>
        </div>
      </div>
    </div>
  )
}

