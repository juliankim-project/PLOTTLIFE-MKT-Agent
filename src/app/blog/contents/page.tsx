"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Icon, PageHeader } from "../_ui"
import { CHANNELS, type PublishChannel } from "../_lib/channels"

interface DraftItem {
  id: string
  topic_id: string | null
  title: string
  status: string
  progress_pct: number | null
  primary_keyword: string | null
  target_kpi: string | null
  metadata: {
    scheduled_at?: string | null
    published_at?: string | null
    provider?: string
    model?: string
    channels?: string[]
  } | null
  created_at: string
  updated_at: string
}

type StatusFilter = "all" | "approved" | "scheduled" | "published" | "trash"

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string; border: string }> = {
  approved:  { label: "저장됨",   color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" },
  scheduled: { label: "발행예정", color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  published: { label: "발행완료", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  drafting:  { label: "작성 중",  color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" },
  reviewing: { label: "검수 중",  color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  rewriting: { label: "재작성",   color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
  discarded: { label: "휴지통",   color: "#991b1b", bg: "#fef2f2", border: "#fecaca" },
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

/** 현재 로컬 시각을 datetime-local input 형식으로 (+1시간 기본) */
function defaultScheduledInput(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatScheduled(iso?: string | null): string {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleString("ko-KR", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return ""
  }
}

export default function ContentsPage() {
  const router = useRouter()
  const [contents, setContents] = useState<DraftItem[]>([])
  const [trashed, setTrashed] = useState<DraftItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")
  const [modalId, setModalId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [a, s, p, d] = await Promise.all([
        safeFetchJson<{ ok: boolean; drafts?: DraftItem[] }>(
          "/api/drafts?status=approved&limit=100",
          { cache: "no-store" }
        ),
        safeFetchJson<{ ok: boolean; drafts?: DraftItem[] }>(
          "/api/drafts?status=scheduled&limit=100",
          { cache: "no-store" }
        ),
        safeFetchJson<{ ok: boolean; drafts?: DraftItem[] }>(
          "/api/drafts?status=published&limit=100",
          { cache: "no-store" }
        ),
        safeFetchJson<{ ok: boolean; drafts?: DraftItem[] }>(
          "/api/drafts?status=discarded&limit=100",
          { cache: "no-store" }
        ),
      ])
      const combined = [...(a.drafts ?? []), ...(s.drafts ?? []), ...(p.drafts ?? [])].sort(
        (a, b) => b.updated_at.localeCompare(a.updated_at)
      )
      setContents(combined)
      setTrashed(
        (d.drafts ?? []).sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const visible = useMemo(() => {
    let list = filter === "trash" ? trashed : contents
    if (filter !== "all" && filter !== "trash") list = list.filter((d) => d.status === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((d) => d.title.toLowerCase().includes(q))
    }
    return list
  }, [contents, trashed, filter, search])

  const counts = useMemo(() => {
    return {
      all: contents.length,
      approved: contents.filter((d) => d.status === "approved").length,
      scheduled: contents.filter((d) => d.status === "scheduled").length,
      published: contents.filter((d) => d.status === "published").length,
      trash: trashed.length,
    }
  }, [contents, trashed])

  const isTrashView = filter === "trash"

  /* 필터 변경 시 선택 초기화 */
  useEffect(() => {
    setSelectedIds(new Set())
  }, [filter])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  const toggleAllVisible = () => {
    const ids = visible.map((d) => d.id)
    setSelectedIds((prev) => {
      const allSelected = ids.every((id) => prev.has(id))
      if (allSelected) {
        const n = new Set(prev)
        ids.forEach((id) => n.delete(id))
        return n
      }
      const n = new Set(prev)
      ids.forEach((id) => n.add(id))
      return n
    })
  }

  /** 다중 선택 휴지통 이동 (또는 휴지통 뷰에선 영구삭제) */
  const handleBulkAction = async () => {
    if (selectedIds.size === 0) return
    const action = isTrashView ? "영구삭제" : "휴지통 이동"
    const warn = isTrashView
      ? `선택한 ${selectedIds.size}개를 영구 삭제할까요?\n\n⚠️ 복원할 수 없어요.`
      : `선택한 ${selectedIds.size}개를 휴지통으로 보낼까요?\n\n(휴지통 탭에서 복원할 수 있어요)`
    if (!confirm(warn)) return
    setBulkBusy(true)
    try {
      const ids = Array.from(selectedIds)
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/drafts/${id}${isTrashView ? "?hard=1" : ""}`, { method: "DELETE" })
        )
      )
      setSelectedIds(new Set())
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} 실패`)
    } finally {
      setBulkBusy(false)
    }
  }

  const currentModal = modalId ? contents.find((d) => d.id === modalId) ?? null : null

  /** 콘텐츠 삭제 (soft → 휴지통으로 이동) */
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title.slice(0, 40)}${title.length > 40 ? "…" : ""}" 콘텐츠를 삭제할까요?\n\n(휴지통으로 이동됩니다 — 휴지통 탭에서 복원 가능)`)) return
    try {
      const j = await safeFetchJson<{ ok: boolean; error?: string }>(
        `/api/drafts/${id}`,
        { method: "DELETE" }
      )
      if (!j.ok) throw new Error(j.error ?? "삭제 실패")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패")
    }
  }

  /** 휴지통에서 복원 (status='approved') */
  const handleRestore = async (id: string) => {
    try {
      const j = await safeFetchJson<{ ok: boolean; error?: string }>(
        `/api/drafts/${id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        }
      )
      if (!j.ok) throw new Error(j.error ?? "복원 실패")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "복원 실패")
    }
  }

  /** 휴지통에서 영구 삭제 (?hard=1) */
  const handleHardDelete = async (id: string, title: string) => {
    if (!confirm(`"${title.slice(0, 40)}${title.length > 40 ? "…" : ""}" 영구 삭제할까요?\n\n⚠️ 복원할 수 없어요. 본문·이미지·관련 발행 이력 모두 사라집니다.`)) return
    try {
      const j = await safeFetchJson<{ ok: boolean; error?: string }>(
        `/api/drafts/${id}?hard=1`,
        { method: "DELETE" }
      )
      if (!j.ok) throw new Error(j.error ?? "영구삭제 실패")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "영구삭제 실패")
    }
  }

  /** 모달에서 status/schedule/channels 업데이트 */
  const applyPublishSetting = async (
    id: string,
    action: "save" | "schedule" | "publishNow" | "unschedule",
    opts: { scheduledAt?: string; channels?: string[] } = {}
  ) => {
    try {
      const body: Record<string, unknown> = {}
      if (action === "save") {
        body.status = "approved"
        body.scheduledAt = null
      } else if (action === "schedule") {
        body.status = "scheduled"
        if (opts.scheduledAt) body.scheduledAt = new Date(opts.scheduledAt).toISOString()
      } else if (action === "publishNow") {
        body.status = "published"
      } else if (action === "unschedule") {
        body.status = "approved"
        body.scheduledAt = null
      }
      if (opts.channels) body.channels = opts.channels
      const j = await safeFetchJson<{ ok: boolean; error?: string }>(
        `/api/drafts/${id}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }
      )
      if (!j.ok) throw new Error(j.error ?? "저장 실패")
      setModalId(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패")
    }
  }

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 06 · CONTENTS"
        title="콘텐츠 관리"
        sub="검수에서 저장된 글들을 관리합니다. 각 콘텐츠의 발행 세팅을 모달에서 지정하세요."
        actions={[
          { label: "← 검수", href: "/blog/review" },
          { label: "발행관리로 →", primary: true, href: "/blog/publish" },
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
            alignItems: "center",
          }}
        >
          <span>⚠️</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{ color: "var(--danger-fg)", background: "transparent", border: 0 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 요약 KPI 4장 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <SummaryTile label="전체" value={counts.all} />
        <SummaryTile label="저장됨" value={counts.approved} accent="emerald" />
        <SummaryTile label="발행예정" value={counts.scheduled} accent="amber" />
        <SummaryTile label="발행완료" value={counts.published} accent="blue" />
      </div>

      {/* 필터 + 검색 */}
      <div className="bcard" style={{ marginBottom: 14 }}>
        <div
          style={{
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {(
              [
                { k: "all",       l: "전체" },
                { k: "approved",  l: "저장됨" },
                { k: "scheduled", l: "발행예정" },
                { k: "published", l: "발행완료" },
              ] as const
            ).map((t) => (
              <button
                key={t.k}
                onClick={() => setFilter(t.k)}
                className={`bbtn ${filter === t.k ? "bbtn--primary" : "bbtn--ghost"} bbtn--sm`}
              >
                {t.l}
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: 8,
                    background: filter === t.k ? "rgba(255,255,255,.25)" : "var(--bg-muted)",
                    color: filter === t.k ? "white" : "var(--text-tertiary)",
                    marginLeft: 4,
                  }}
                >
                  {t.k === "all" ? counts.all : counts[t.k]}
                </span>
              </button>
            ))}
            {/* 휴지통 별도 — 시각적 분리 */}
            <span style={{ width: 1, background: "var(--border-default)", margin: "0 6px" }} />
            <button
              onClick={() => setFilter("trash")}
              className={`bbtn ${filter === "trash" ? "bbtn--primary" : "bbtn--ghost"} bbtn--sm`}
              title="삭제된 콘텐츠 (복원 가능)"
              style={
                filter === "trash"
                  ? { background: "#991b1b", borderColor: "#991b1b" }
                  : { color: counts.trash > 0 ? "#991b1b" : undefined }
              }
            >
              🗑 휴지통
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "1px 6px",
                  borderRadius: 8,
                  background:
                    filter === "trash"
                      ? "rgba(255,255,255,.25)"
                      : counts.trash > 0
                      ? "#fecaca"
                      : "var(--bg-muted)",
                  color:
                    filter === "trash" ? "white" : counts.trash > 0 ? "#991b1b" : "var(--text-tertiary)",
                  marginLeft: 4,
                }}
              >
                {counts.trash}
              </span>
            </button>
          </div>
          <input
            placeholder="🔍 제목 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              minWidth: 200,
              padding: "6px 10px",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--r-md)",
              fontSize: 13,
              outline: "none",
              background: "var(--bg-subtle)",
            }}
          />
        </div>
      </div>

      {/* 리스트 */}
      <div className="bcard">
        <div className="bcard__header">
          <div>
            <div className="bcard__title">콘텐츠 목록</div>
            <div className="bcard__sub">
              {loading ? "로드 중…" : `${visible.length}개 표시`}
            </div>
          </div>
        </div>

        {/* 다중 선택 액션바 */}
        {selectedIds.size > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 20px",
              background: isTrashView ? "#fef2f2" : "var(--brand-50)",
              borderBottom: `1px solid ${isTrashView ? "#fecaca" : "var(--brand-200)"}`,
              fontSize: 12.5,
            }}
          >
            <span style={{ fontWeight: 700, color: isTrashView ? "#991b1b" : "var(--brand-700)" }}>
              ✓ {selectedIds.size}개 선택됨
            </span>
            <button
              className="bbtn bbtn--ghost bbtn--sm"
              onClick={() => setSelectedIds(new Set())}
              style={{ marginLeft: "auto" }}
            >
              선택 해제
            </button>
            <button
              className="bbtn bbtn--sm"
              onClick={handleBulkAction}
              disabled={bulkBusy}
              style={{ background: "#991b1b", color: "white", border: "1px solid #991b1b" }}
            >
              {bulkBusy
                ? "처리 중…"
                : isTrashView
                ? `🔥 영구삭제 (${selectedIds.size})`
                : `🗑 휴지통으로 (${selectedIds.size})`}
            </button>
          </div>
        )}

        {/* 헤더 (체크박스용) */}
        {visible.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "32px 1fr 100px 130px 220px",
              gap: 12,
              alignItems: "center",
              padding: "8px 20px",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-muted)",
              background: "var(--bg-subtle)",
              borderBottom: "1px solid var(--border-default)",
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <input
                type="checkbox"
                checked={
                  visible.length > 0 && visible.every((d) => selectedIds.has(d.id))
                }
                onChange={toggleAllVisible}
                style={{ accentColor: "var(--brand-600)", cursor: "pointer" }}
                aria-label="전체 선택"
              />
            </div>
            <div>제목</div>
            <div>상태</div>
            <div>업데이트</div>
            <div style={{ textAlign: "right" }}>액션</div>
          </div>
        )}

        {visible.length === 0 && !loading ? (
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: 13,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>
              {isTrashView ? "🗑" : "📂"}
            </div>
            {isTrashView ? (
              <>휴지통이 비어있어요.</>
            ) : (
              <>
                {filter === "all"
                  ? "아직 저장된 콘텐츠가 없어요."
                  : "해당 상태의 콘텐츠가 없어요."}
                <br />
                먼저{" "}
                <Link href="/blog/review" style={{ color: "var(--brand-600)", fontWeight: 600 }}>
                  검수
                </Link>
                에서 저장해주세요.
              </>
            )}
          </div>
        ) : (
          <div>
            {visible.map((d) => {
              const st = STATUS_LABEL[d.status] ?? STATUS_LABEL.approved
              const scheduled = d.metadata?.scheduled_at
              const checked = selectedIds.has(d.id)
              return (
                <div
                  key={d.id}
                  className="content-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr 100px 130px 220px",
                    gap: 12,
                    alignItems: "center",
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border-subtle)",
                    background: checked ? "var(--brand-50)" : undefined,
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(d.id)}
                      style={{ accentColor: "var(--brand-600)", cursor: "pointer" }}
                      aria-label={`${d.title} 선택`}
                    />
                  </div>
                  <div
                    onClick={() => {
                      if (!isTrashView) router.push(`/blog/contents/${d.id}`)
                    }}
                    style={{ minWidth: 0, cursor: isTrashView ? "default" : "pointer" }}
                  >
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        lineHeight: 1.4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.title}
                    </div>
                    {d.primary_keyword && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        🎯 {d.primary_keyword}
                      </div>
                    )}
                  </div>
                  <span
                    className="bchip"
                    style={{
                      background: st.bg,
                      color: st.color,
                      border: `1px solid ${st.border}`,
                      fontSize: 10.5,
                      fontWeight: 600,
                      justifySelf: "start",
                    }}
                  >
                    {st.label}
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    {scheduled
                      ? `📅 ${formatScheduled(scheduled)}`
                      : new Date(d.updated_at).toLocaleDateString("ko-KR", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                  </span>
                  <div style={{ display: "flex", gap: 6, justifySelf: "end" }}>
                    {isTrashView ? (
                      <>
                        <button
                          className="bbtn bbtn--ghost bbtn--sm"
                          onClick={() => handleRestore(d.id)}
                          title="복원 (저장됨으로 되돌리기)"
                        >
                          ↩️ 복원
                        </button>
                        <button
                          className="bbtn bbtn--sm"
                          onClick={() => handleHardDelete(d.id, d.title)}
                          title="영구 삭제 (복원 불가)"
                          style={{
                            background: "#991b1b",
                            color: "white",
                            border: "1px solid #991b1b",
                          }}
                        >
                          🔥 영구삭제
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="bbtn bbtn--ghost bbtn--sm"
                          onClick={() => router.push(`/blog/contents/${d.id}`)}
                          title="편집"
                        >
                          <Icon name="pen" size={11} /> 편집
                        </button>
                        <button
                          className="bbtn bbtn--primary bbtn--sm"
                          onClick={() => setModalId(d.id)}
                          title="발행 세팅"
                        >
                          <Icon name="send" size={11} /> 발행 세팅
                        </button>
                        <button
                          className="bbtn bbtn--ghost bbtn--sm content-row__del"
                          onClick={() => handleDelete(d.id, d.title)}
                          title="삭제 (휴지통으로 이동)"
                          aria-label="삭제"
                          style={{ color: "var(--danger-fg)", padding: "4px 8px" }}
                        >
                          🗑
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 발행 세팅 모달 */}
      {currentModal && (
        <PublishSettingModal
          draft={currentModal}
          onClose={() => setModalId(null)}
          onApply={applyPublishSetting}
        />
      )}

      <style jsx>{`
        :global(.content-row:hover) {
          background: var(--bg-subtle);
        }
      `}</style>
    </div>
  )
}

function PublishSettingModal({
  draft,
  onClose,
  onApply,
}: {
  draft: DraftItem
  onClose: () => void
  onApply: (
    id: string,
    action: "save" | "schedule" | "publishNow" | "unschedule",
    opts?: { scheduledAt?: string; channels?: string[] }
  ) => Promise<void>
}) {
  const [mode, setMode] = useState<"now" | "schedule">(
    draft.status === "scheduled" ? "schedule" : "now"
  )
  const [dt, setDt] = useState<string>(
    draft.metadata?.scheduled_at
      ? draft.metadata.scheduled_at.slice(0, 16)
      : defaultScheduledInput()
  )
  /* 채널 선택 — draft.metadata.channels 가 있으면 그걸로, 없으면 defaultEnabled 채널 자동 체크 */
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(() => {
    if (draft.metadata?.channels && draft.metadata.channels.length > 0) {
      return new Set(draft.metadata.channels)
    }
    return new Set(CHANNELS.filter((c) => c.defaultEnabled).map((c) => c.id))
  })
  const [busy, setBusy] = useState<false | "publishNow" | "schedule" | "unschedule">(false)

  const st = STATUS_LABEL[draft.status] ?? STATUS_LABEL.approved

  const toggleChannel = (id: string) => {
    setSelectedChannels((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const handle = async (action: "publishNow" | "schedule" | "unschedule") => {
    setBusy(action)
    await onApply(draft.id, action, {
      scheduledAt: action === "schedule" ? dt : undefined,
      channels: Array.from(selectedChannels),
    })
    setBusy(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.65)",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
        backdropFilter: "blur(8px) saturate(140%)",
        WebkitBackdropFilter: "blur(8px) saturate(140%)",
        padding: 24,
        animation: "modal-fade-in 0.18s ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: 16,
          width: "min(640px, 100%)",
          maxHeight: "calc(100vh - 48px)",
          overflow: "auto",
          boxShadow:
            "0 1px 3px rgba(15, 23, 42, 0.1), 0 24px 60px rgba(15, 23, 42, 0.30), 0 0 0 1px rgba(15, 23, 42, 0.06)",
          animation: "modal-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <style jsx global>{`
          @keyframes modal-fade-in {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
          @keyframes modal-pop {
            from { opacity: 0; transform: translateY(8px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
        {/* 헤더 */}
        <div
          style={{
            padding: "18px 24px 14px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            background: "linear-gradient(180deg, #fafbff 0%, #ffffff 100%)",
            borderBottom: "1px solid #eef0ff",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "var(--brand-700)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              발행 세팅
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                lineHeight: 1.35,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as const,
              }}
            >
              {draft.title}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: st.bg,
                  color: st.color,
                  border: `1px solid ${st.border}`,
                }}
              >
                {st.label}
              </span>
              {draft.metadata?.scheduled_at && draft.status === "scheduled" && (
                <span style={{ fontSize: 11.5, color: "#b45309", fontWeight: 600 }}>
                  📅 {formatScheduled(draft.metadata.scheduled_at)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-subtle)",
              border: 0,
              width: 32,
              height: 32,
              borderRadius: 8,
              fontSize: 14,
              color: "var(--text-secondary)",
              cursor: "pointer",
              flexShrink: 0,
              transition: "background 0.12s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#e5e7eb")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 바디 */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 22 }}>
          {/* 모드 선택 */}
          <section>
            <SectionLabel num="1" label="발행 방식" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <ModeCard
                emoji="🚀"
                label="지금 발행"
                sub="즉시 발행완료로"
                on={mode === "now"}
                onClick={() => setMode("now")}
              />
              <ModeCard
                emoji="📅"
                label="예약 발행"
                sub="특정 시각에 자동"
                on={mode === "schedule"}
                onClick={() => setMode("schedule")}
              />
            </div>
          </section>

          {mode === "schedule" && (
            <section>
              <SectionLabel num="2" label="발행 예정 시각" />
              <input
                type="datetime-local"
                value={dt}
                onChange={(e) => setDt(e.target.value)}
                style={{
                  width: "100%",
                  padding: "11px 14px",
                  border: "1px solid var(--border-default)",
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "inherit",
                  background: "white",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              />
              <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 6 }}>
                ⏰ 해당 시각에 아래 선택한 채널로 자동 배포됩니다.
              </div>
            </section>
          )}

          {/* 채널 선택 그리드 */}
          <section>
            <SectionLabel
              num={mode === "schedule" ? "3" : "2"}
              label="발행 채널"
              right={
                <>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                    {selectedChannels.size}개 선택
                  </span>
                  <Link
                    href="/blog/publish"
                    style={{
                      fontSize: 11,
                      color: "var(--brand-600)",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    채널 ON/OFF →
                  </Link>
                </>
              }
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {CHANNELS.map((c) => (
                <ChannelCard
                  key={c.id}
                  channel={c}
                  on={selectedChannels.has(c.id)}
                  onToggle={() => toggleChannel(c.id)}
                />
              ))}
            </div>
            {selectedChannels.size === 0 && (
              <div
                style={{
                  marginTop: 10,
                  padding: "10px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#991b1b",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span>⚠️</span>
                <span>채널을 1개 이상 선택해야 발행할 수 있어요.</span>
              </div>
            )}
          </section>
        </div>

        {/* 푸터 */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #eef0ff",
            display: "flex",
            gap: 8,
            alignItems: "center",
            justifyContent: "flex-end",
            background: "#fafbff",
          }}
        >
          {draft.status === "scheduled" && (
            <button
              type="button"
              onClick={() => handle("unschedule")}
              disabled={!!busy}
              title="예약 취소하고 '저장됨'으로 되돌리기"
              style={{
                marginRight: "auto",
                background: "transparent",
                border: "1px solid var(--border-default)",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: 600,
                color: "var(--text-secondary)",
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.6 : 1,
              }}
            >
              {busy === "unschedule" ? "취소 중…" : "예약 취소"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={!!busy}
            style={{
              background: "transparent",
              border: 0,
              padding: "8px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              color: "var(--text-secondary)",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            닫기
          </button>
          {mode === "now" ? (
            <button
              type="button"
              onClick={() => handle("publishNow")}
              disabled={!!busy || selectedChannels.size === 0}
              style={{
                background:
                  busy || selectedChannels.size === 0
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, var(--brand-600) 0%, var(--brand-700) 100%)",
                color: "white",
                border: 0,
                padding: "10px 18px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: busy || selectedChannels.size === 0 ? "not-allowed" : "pointer",
                boxShadow:
                  busy || selectedChannels.size === 0
                    ? "none"
                    : "0 1px 2px rgba(99,102,241,0.2), 0 4px 12px rgba(99,102,241,0.25)",
                transition: "all 0.12s",
              }}
            >
              {busy === "publishNow" ? "발행 중…" : `🚀 ${selectedChannels.size}개 채널로 지금 발행`}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handle("schedule")}
              disabled={!!busy || !dt || selectedChannels.size === 0}
              style={{
                background:
                  busy || !dt || selectedChannels.size === 0
                    ? "#cbd5e1"
                    : "linear-gradient(135deg, var(--brand-600) 0%, var(--brand-700) 100%)",
                color: "white",
                border: 0,
                padding: "10px 18px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 700,
                cursor: busy || !dt || selectedChannels.size === 0 ? "not-allowed" : "pointer",
                boxShadow:
                  busy || !dt || selectedChannels.size === 0
                    ? "none"
                    : "0 1px 2px rgba(99,102,241,0.2), 0 4px 12px rgba(99,102,241,0.25)",
                transition: "all 0.12s",
              }}
            >
              {busy === "schedule" ? "저장 중…" : `📅 ${selectedChannels.size}개 채널로 예약`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({
  num,
  label,
  right,
}: {
  num: string
  label: string
  right?: React.ReactNode
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: 10,
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "var(--brand-100)",
          color: "var(--brand-700)",
          fontSize: 11,
          fontWeight: 800,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {num}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "var(--text-primary)",
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </span>
      {right && (
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {right}
        </div>
      )}
    </div>
  )
}

function ChannelCard({
  channel,
  on,
  onToggle,
}: {
  channel: PublishChannel
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        textAlign: "left",
        padding: "11px 12px",
        borderRadius: 10,
        border: `1.5px solid ${on ? "var(--brand-500)" : "var(--border-default)"}`,
        background: on ? "var(--brand-50)" : "white",
        cursor: "pointer",
        display: "flex",
        gap: 10,
        alignItems: "center",
        transition: "all 0.15s ease",
        boxShadow: on
          ? "0 0 0 1px var(--brand-500) inset, 0 1px 2px rgba(99,102,241,0.08)"
          : "0 1px 2px rgba(15, 23, 42, 0.03)",
      }}
      onMouseEnter={(e) => {
        if (!on) e.currentTarget.style.borderColor = "var(--brand-300)"
      }}
      onMouseLeave={(e) => {
        if (!on) e.currentTarget.style.borderColor = "var(--border-default)"
      }}
    >
      <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{channel.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            marginBottom: 2,
            color: on ? "var(--brand-800, #3730a3)" : "var(--text-primary)",
            letterSpacing: "-0.01em",
          }}
        >
          {channel.name}
        </div>
        <div
          style={{
            fontSize: 10.5,
            color: on ? "var(--brand-700)" : "var(--text-muted)",
            lineHeight: 1.4,
            opacity: on ? 0.85 : 1,
          }}
        >
          {channel.format}
        </div>
      </div>
      <span
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: `1.5px solid ${on ? "var(--brand-600)" : "var(--border-strong)"}`,
          background: on ? "var(--brand-600)" : "white",
          display: "grid",
          placeItems: "center",
          color: "white",
          fontSize: 11,
          fontWeight: 800,
          flexShrink: 0,
          transition: "all 0.12s",
        }}
      >
        {on ? "✓" : ""}
      </span>
    </button>
  )
}

function ModeCard({
  emoji,
  label,
  sub,
  on,
  onClick,
}: {
  emoji: string
  label: string
  sub: string
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "16px 12px",
        borderRadius: 10,
        border: `1.5px solid ${on ? "var(--brand-500)" : "var(--border-default)"}`,
        background: on
          ? "linear-gradient(180deg, var(--brand-50) 0%, white 100%)"
          : "white",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        alignItems: "center",
        transition: "all 0.15s ease",
        boxShadow: on
          ? "0 0 0 1px var(--brand-500) inset, 0 1px 2px rgba(99,102,241,0.1)"
          : "0 1px 2px rgba(15, 23, 42, 0.03)",
      }}
      onMouseEnter={(e) => {
        if (!on) e.currentTarget.style.borderColor = "var(--brand-300)"
      }}
      onMouseLeave={(e) => {
        if (!on) e.currentTarget.style.borderColor = "var(--border-default)"
      }}
    >
      <div style={{ fontSize: 24, lineHeight: 1, marginBottom: 2 }}>{emoji}</div>
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 700,
          color: on ? "var(--brand-800, #3730a3)" : "var(--text-primary)",
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 11,
          color: on ? "var(--brand-700)" : "var(--text-muted)",
          opacity: on ? 0.85 : 1,
        }}
      >
        {sub}
      </div>
    </button>
  )
}

function SummaryTile({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent?: "emerald" | "amber" | "blue"
}) {
  const palette = {
    emerald: { bg: "#ecfdf5", border: "#a7f3d0", fg: "#047857" },
    amber:   { bg: "#fffbeb", border: "#fde68a", fg: "#b45309" },
    blue:    { bg: "#eff6ff", border: "#bfdbfe", fg: "#1d4ed8" },
  }
  const p = accent ? palette[accent] : { bg: "var(--bg-surface)", border: "var(--border-default)", fg: "var(--text-primary)" }
  return (
    <div
      style={{
        background: p.bg,
        border: `1px solid ${p.border}`,
        borderRadius: "var(--r-lg)",
        padding: "14px 18px",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          color: "var(--text-muted)",
          textTransform: "uppercase",
          letterSpacing: ".05em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginTop: 4,
          color: p.fg,
          letterSpacing: "-.01em",
        }}
      >
        {value}개
      </div>
    </div>
  )
}
