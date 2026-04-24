"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Icon, PageHeader } from "../_ui"

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
  } | null
  created_at: string
  updated_at: string
}

type StatusFilter = "all" | "approved" | "scheduled" | "published"

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string; border: string }> = {
  approved:  { label: "저장됨",   color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" },
  scheduled: { label: "발행예정", color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  published: { label: "발행완료", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  drafting:  { label: "작성 중",  color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" },
  reviewing: { label: "검수 중",  color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  rewriting: { label: "재작성",   color: "#92400e", bg: "#fffbeb", border: "#fde68a" },
  discarded: { label: "폐기",     color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" },
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")
  const [modalId, setModalId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [a, s, p] = await Promise.all([
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
      ])
      const combined = [...(a.drafts ?? []), ...(s.drafts ?? []), ...(p.drafts ?? [])].sort(
        (a, b) => b.updated_at.localeCompare(a.updated_at)
      )
      setContents(combined)
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
    let list = contents
    if (filter !== "all") list = list.filter((d) => d.status === filter)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((d) => d.title.toLowerCase().includes(q))
    }
    return list
  }, [contents, filter, search])

  const counts = useMemo(() => {
    return {
      all: contents.length,
      approved: contents.filter((d) => d.status === "approved").length,
      scheduled: contents.filter((d) => d.status === "scheduled").length,
      published: contents.filter((d) => d.status === "published").length,
    }
  }, [contents])

  const currentModal = modalId ? contents.find((d) => d.id === modalId) ?? null : null

  /** 모달에서 status/schedule 업데이트 */
  const applyPublishSetting = async (
    id: string,
    action: "save" | "schedule" | "publishNow" | "unschedule",
    scheduledAt?: string
  ) => {
    try {
      const body: Record<string, unknown> = {}
      if (action === "save") {
        body.status = "approved"
        body.scheduledAt = null
      } else if (action === "schedule") {
        body.status = "scheduled"
        if (scheduledAt) body.scheduledAt = new Date(scheduledAt).toISOString()
      } else if (action === "publishNow") {
        body.status = "published"
      } else if (action === "unschedule") {
        body.status = "approved"
        body.scheduledAt = null
      }
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
          { label: "← 검수", onClick: () => router.push("/blog/review") },
          { label: "발행관리로 →", primary: true, onClick: () => router.push("/blog/publish") },
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
          <div style={{ display: "flex", gap: 4 }}>
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
            <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>📂</div>
            {filter === "all"
              ? "아직 저장된 콘텐츠가 없어요."
              : "해당 상태의 콘텐츠가 없어요."}
            <br />
            먼저{" "}
            <Link href="/blog/review" style={{ color: "var(--brand-600)", fontWeight: 600 }}>
              검수
            </Link>
            에서 저장해주세요.
          </div>
        ) : (
          <div>
            {visible.map((d) => {
              const st = STATUS_LABEL[d.status] ?? STATUS_LABEL.approved
              const scheduled = d.metadata?.scheduled_at
              return (
                <div
                  key={d.id}
                  className="content-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 120px 140px 180px",
                    gap: 12,
                    alignItems: "center",
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    onClick={() => router.push(`/blog/contents/${d.id}`)}
                    style={{ minWidth: 0, cursor: "pointer" }}
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
    scheduledAt?: string
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
  const [busy, setBusy] = useState<false | "publishNow" | "schedule" | "unschedule">(false)

  const st = STATUS_LABEL[draft.status] ?? STATUS_LABEL.approved

  const handle = async (action: "publishNow" | "schedule" | "unschedule") => {
    setBusy(action)
    await onApply(draft.id, action, action === "schedule" ? dt : undefined)
    setBusy(false)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(17, 24, 39, 0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "white",
          borderRadius: "var(--r-lg)",
          width: "min(520px, 92vw)",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
        }}
      >
        {/* 헤더 */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, flex: 1 }}>📅 발행 세팅</div>
          <span
            className="bchip"
            style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}
          >
            {st.label}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: 0,
              fontSize: 18,
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 2,
            }}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 바디 */}
        <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              padding: "12px 14px",
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--r-md)",
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: ".04em",
                marginBottom: 4,
              }}
            >
              콘텐츠
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4 }}>
              {draft.title}
            </div>
            {draft.metadata?.scheduled_at && draft.status === "scheduled" && (
              <div style={{ fontSize: 11.5, color: "#b45309", marginTop: 6, fontWeight: 600 }}>
                📅 현재 예약: {formatScheduled(draft.metadata.scheduled_at)}
              </div>
            )}
          </div>

          {/* 모드 선택 */}
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: ".05em",
                marginBottom: 8,
              }}
            >
              발행 방식
            </div>
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
          </div>

          {mode === "schedule" && (
            <div>
              <label
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  fontWeight: 600,
                  display: "block",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}
              >
                발행 예정 시각
              </label>
              <input
                type="datetime-local"
                value={dt}
                onChange={(e) => setDt(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-md)",
                  fontSize: 13,
                  fontFamily: "inherit",
                  background: "white",
                }}
              />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6 }}>
                해당 시각에 발행관리 탭에서 자동으로 채널 배포됩니다.
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          {draft.status === "scheduled" && (
            <button
              className="bbtn bbtn--ghost"
              onClick={() => handle("unschedule")}
              disabled={!!busy}
              title="예약 취소하고 '저장됨'으로 되돌리기"
              style={{ marginRight: "auto" }}
            >
              {busy === "unschedule" ? "취소 중…" : "예약 취소"}
            </button>
          )}
          <button className="bbtn bbtn--ghost" onClick={onClose} disabled={!!busy}>
            닫기
          </button>
          {mode === "now" ? (
            <button
              className="bbtn bbtn--primary"
              onClick={() => handle("publishNow")}
              disabled={!!busy}
            >
              {busy === "publishNow" ? "발행 중…" : "🚀 지금 발행"}
            </button>
          ) : (
            <button
              className="bbtn bbtn--primary"
              onClick={() => handle("schedule")}
              disabled={!!busy || !dt}
            >
              {busy === "schedule" ? "저장 중…" : "📅 예약 저장"}
            </button>
          )}
        </div>
      </div>
    </div>
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
        padding: "12px 10px",
        borderRadius: "var(--r-md)",
        border: `1.5px solid ${on ? "var(--brand-500)" : "var(--border-default)"}`,
        background: on ? "var(--brand-50)" : "white",
        boxShadow: on ? "0 0 0 1px var(--brand-500) inset" : undefined,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        alignItems: "center",
        transition: "all 0.12s",
      }}
    >
      <div style={{ fontSize: 20 }}>{emoji}</div>
      <div style={{ fontSize: 12.5, fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>{sub}</div>
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
