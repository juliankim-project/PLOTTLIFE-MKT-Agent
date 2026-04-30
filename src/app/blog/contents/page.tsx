"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Icon, PageHeader } from "../_ui"
import { readCache, writeCache } from "../_lib/cache"
import { PublishSettingModal, ToggleSwitch } from "./_components/publish-modal"
import { pickDabCategory } from "@/lib/dab/category"

interface DraftItem {
  id: string
  topic_id: string | null
  title: string
  status: string
  progress_pct: number | null
  primary_keyword: string | null
  secondary_keywords?: string[] | null
  body_markdown?: string | null
  hero_image_url?: string | null
  target_kpi: string | null
  metadata: {
    scheduled_at?: string | null
    published_at?: string | null
    provider?: string
    model?: string
    channels?: string[]
    /* 대브 어드민 등록 상태 — Phase 5 */
    dab_blog_id?: number
    dab_status?: "DRAFT" | "PUBLISHED"
    dab_category?: string
    dab_registered_at?: string
    /* Phase 6 — 어드민 전송 모델 */
    dab_send_intent?: boolean       // 토글 ON/OFF (사용자 의도)
    dab_send_when?: DabSendWhen     // 즉시 / 5분 뒤 / 10분 뒤 / 1시간 뒤
    dab_send_status?: DabSendStatus // 대기 / 전송 중 / 완료 / 실패
    dab_send_scheduled_at?: string | null  // 예약 시각
    dab_send_at?: string | null     // 실제 전송 시각
    dab_send_error?: string | null  // 실패 시 에러 메시지
  } | null
  created_at: string
  updated_at: string
}

type DabSendWhen = "immediate" | "next-day-midnight"
type DabSendStatus = "queued" | "sending" | "sent" | "failed"

const DAB_SEND_WHEN_OPTIONS: Array<{ value: DabSendWhen; label: string }> = [
  { value: "immediate",         label: "즉시" },
  { value: "next-day-midnight", label: "다음날 00시 (KST)" },
]

/** 기존 데이터에 옛 옵션 값이 있을 수 있어 안전한 fallback */
function safeWhen(v: unknown): DabSendWhen {
  return v === "next-day-midnight" ? "next-day-midnight" : "immediate"
}

const DAB_SEND_STATUS_LABEL: Record<DabSendStatus | "idle", { label: string; emoji: string; bg: string; fg: string; border: string }> = {
  idle:    { label: "—",         emoji: "",   bg: "#f9fafb", fg: "#9ca3af", border: "#e5e7eb" },
  queued:  { label: "대기",      emoji: "⏳", bg: "#fffbeb", fg: "#b45309", border: "#fde68a" },
  sending: { label: "전송 중",   emoji: "⏱",  bg: "#eff6ff", fg: "#1d4ed8", border: "#bfdbfe" },
  sent:    { label: "전송 완료", emoji: "✅", bg: "#ecfdf5", fg: "#047857", border: "#a7f3d0" },
  failed:  { label: "실패",      emoji: "❌", bg: "#fef2f2", fg: "#b91c1c", border: "#fecaca" },
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

export default function ContentsPage() {
  const router = useRouter()
  /* localStorage 캐시 → 첫 페인트 즉시 */
  const cached = useMemo(() => readCache<DraftItem[]>("contents-all"), [])
  const [contents, setContents] = useState<DraftItem[]>(
    () => cached?.filter((d) => d.status !== "discarded") ?? []
  )
  const [trashed, setTrashed] = useState<DraftItem[]>(
    () => cached?.filter((d) => d.status === "discarded") ?? []
  )
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")
  const [modalId, setModalId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      const j = await safeFetchJson<{ ok: boolean; drafts?: DraftItem[] }>(
        "/api/drafts?statuses=approved,scheduled,published,discarded&limit=400",
        { cache: "no-store" }
      )
      const all = (j.drafts ?? []).sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at)
      )
      writeCache("contents-all", all)
      setContents(all.filter((d) => d.status !== "discarded"))
      setTrashed(all.filter((d) => d.status === "discarded"))
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류")
    } finally {
      setLoading(false)
    }
  }, [])

  /** optimistic 후 캐시 동기화 — state 변경 한 다음 fresh state 로 cache write */
  const syncCacheNow = useCallback(
    (nextContents: DraftItem[], nextTrashed: DraftItem[]) => {
      const merged = [...nextContents, ...nextTrashed].sort((a, b) =>
        b.updated_at.localeCompare(a.updated_at)
      )
      writeCache("contents-all", merged)
    },
    []
  )

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

  /** 다중 선택 휴지통 이동 (또는 휴지통 뷰에선 영구삭제) — optimistic + cache sync */
  const handleBulkAction = async () => {
    if (selectedIds.size === 0) return
    const action = isTrashView ? "영구삭제" : "휴지통 이동"
    const warn = isTrashView
      ? `선택한 ${selectedIds.size}개를 영구 삭제할까요?\n\n⚠️ 복원할 수 없어요.`
      : `선택한 ${selectedIds.size}개를 휴지통으로 보낼까요?\n\n(휴지통 탭에서 복원할 수 있어요)`
    if (!confirm(warn)) return
    const ids = new Set(selectedIds)
    setBulkBusy(true)
    /* 낙관적 업데이트 + cache sync */
    let nextContents = contents
    let nextTrashed = trashed
    if (isTrashView) {
      nextTrashed = trashed.filter((d) => !ids.has(d.id))
    } else {
      const moved: DraftItem[] = []
      nextContents = contents.filter((d) => {
        if (ids.has(d.id)) {
          moved.push({ ...d, status: "discarded" })
          return false
        }
        return true
      })
      nextTrashed = [...moved, ...trashed]
    }
    setContents(nextContents)
    setTrashed(nextTrashed)
    syncCacheNow(nextContents, nextTrashed)
    setSelectedIds(new Set())
    try {
      await Promise.all(
        Array.from(ids).map((id) =>
          fetch(`/api/drafts/${id}${isTrashView ? "?hard=1" : ""}`, { method: "DELETE" })
        )
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : `${action} 실패`)
      await load()
    } finally {
      setBulkBusy(false)
    }
  }

  const currentModal = modalId ? contents.find((d) => d.id === modalId) ?? null : null

  /** 콘텐츠 삭제 (soft → 휴지통으로 이동) — optimistic + cache sync */
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title.slice(0, 40)}${title.length > 40 ? "…" : ""}" 콘텐츠를 삭제할까요?\n\n(휴지통으로 이동됩니다 — 휴지통 탭에서 복원 가능)`)) return
    const removed = contents.find((d) => d.id === id)
    const nextContents = contents.filter((d) => d.id !== id)
    const nextTrashed = removed ? [{ ...removed, status: "discarded" }, ...trashed] : trashed
    setContents(nextContents)
    setTrashed(nextTrashed)
    syncCacheNow(nextContents, nextTrashed)
    try {
      const j = await safeFetchJson<{ ok: boolean; error?: string }>(
        `/api/drafts/${id}`,
        { method: "DELETE" }
      )
      if (!j.ok) throw new Error(j.error ?? "삭제 실패")
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패")
      await load()
    }
  }

  /** 휴지통에서 복원 — optimistic + cache sync */
  const handleRestore = async (id: string) => {
    const restored = trashed.find((d) => d.id === id)
    const nextTrashed = trashed.filter((d) => d.id !== id)
    const nextContents = restored
      ? [{ ...restored, status: "approved" }, ...contents]
      : contents
    setTrashed(nextTrashed)
    setContents(nextContents)
    syncCacheNow(nextContents, nextTrashed)
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
    } catch (e) {
      setError(e instanceof Error ? e.message : "복원 실패")
      await load()
    }
  }

  /** 휴지통에서 영구 삭제 — optimistic + cache sync */
  const handleHardDelete = async (id: string, title: string) => {
    if (!confirm(`"${title.slice(0, 40)}${title.length > 40 ? "…" : ""}" 영구 삭제할까요?\n\n⚠️ 복원할 수 없어요. 본문·이미지·관련 발행 이력 모두 사라집니다.`)) return
    const nextTrashed = trashed.filter((d) => d.id !== id)
    setTrashed(nextTrashed)
    syncCacheNow(contents, nextTrashed)
    try {
      const j = await safeFetchJson<{ ok: boolean; error?: string }>(
        `/api/drafts/${id}?hard=1`,
        { method: "DELETE" }
      )
      if (!j.ok) throw new Error(j.error ?? "영구삭제 실패")
    } catch (e) {
      setError(e instanceof Error ? e.message : "영구삭제 실패")
      await load()
    }
  }

  /** "보낼까요?" 토글 — ON 누르면 즉시 또는 예약, OFF 누르면 metadata 만 클리어 */
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const callDabApi = async (body: object): Promise<DraftItem["metadata"] | null> => {
    const j = await safeFetchJson<{
      ok: boolean
      error?: string
      metadata?: DraftItem["metadata"]
    }>("/api/dab/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!j.ok || !j.metadata) throw new Error(j.error ?? "API 호출 실패")
    return j.metadata
  }

  const updateDraftMetadata = (draftId: string, metadata: DraftItem["metadata"]) => {
    const next = contents.map((d) => (d.id === draftId ? { ...d, metadata } : d))
    setContents(next)
    syncCacheNow(next, trashed)
  }

  const handleToggleSendIntent = async (draft: DraftItem, nextOn: boolean) => {
    setTogglingId(draft.id)
    setError(null)
    try {
      if (!nextOn) {
        /* OFF — metadata 만 클리어 (어드민 호출 X, dab_blog_id 유지) */
        const meta = await callDabApi({ action: "untoggle", draftId: draft.id })
        if (meta) updateDraftMetadata(draft.id, meta)
        return
      }

      /* ON — 카테고리 결정 + when 에 따라 분기 */
      const category =
        (draft.metadata?.dab_category as import("@/lib/dab/category").DabCategory) ??
        pickDabCategory({
          title: draft.title,
          primaryKeyword: draft.primary_keyword,
          secondaryKeywords: draft.secondary_keywords,
        })
      const when: DabSendWhen = safeWhen(draft.metadata?.dab_send_when)

      if (when === "immediate") {
        const meta = await callDabApi({ action: "send", draftId: draft.id, category })
        if (meta) updateDraftMetadata(draft.id, meta)
      } else {
        /* 예약 — queued 상태로 metadata 업데이트 (실제 발송은 다음 PR 워커) */
        const meta = await callDabApi({ action: "schedule", draftId: draft.id, category, when })
        if (meta) updateDraftMetadata(draft.id, meta)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "토글 처리 실패")
    } finally {
      setTogglingId(null)
    }
  }

  const handleChangeWhen = async (draft: DraftItem, when: DabSendWhen) => {
    setError(null)
    try {
      /* 토글 ON 상태에서 when 변경하면 다시 schedule 호출, OFF 면 set-when 만 */
      const action: "schedule" | "set-when" = draft.metadata?.dab_send_intent ? "schedule" : "set-when"
      const category =
        (draft.metadata?.dab_category as import("@/lib/dab/category").DabCategory) ??
        pickDabCategory({
          title: draft.title,
          primaryKeyword: draft.primary_keyword,
          secondaryKeywords: draft.secondary_keywords,
        })
      const meta = await callDabApi(
        action === "schedule"
          ? { action, draftId: draft.id, category, when }
          : { action, draftId: draft.id, when }
      )
      if (meta) updateDraftMetadata(draft.id, meta)
    } catch (e) {
      setError(e instanceof Error ? e.message : "예약 시간 변경 실패")
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

        {/* 헤더 */}
        {visible.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "32px 90px 56px 1fr 90px 110px 100px 80px 160px",
              gap: 12,
              alignItems: "center",
              padding: "10px 20px",
              fontSize: 10.5,
              fontWeight: 700,
              color: "var(--text-secondary, #475569)",
              background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
              borderBottom: "1px solid var(--border-default)",
              borderTop: "1px solid var(--border-default)",
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
            <div style={{ textAlign: "center" }}>어드민 전송</div>
            <div style={{ textAlign: "center" }}>썸네일</div>
            <div>제목 / 작성자</div>
            <div>카테고리</div>
            <div>전송 시점</div>
            <div>전송 상태</div>
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
              const dabCategory = d.metadata?.dab_category ?? pickDabCategory({
                title: d.title,
                primaryKeyword: d.primary_keyword,
                secondaryKeywords: d.secondary_keywords,
              })
              const checked = selectedIds.has(d.id)
              return (
                <div
                  key={d.id}
                  className="content-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 90px 56px 1fr 90px 110px 100px 80px 160px",
                    gap: 12,
                    alignItems: "center",
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border-subtle)",
                    background: checked ? "var(--brand-50)" : "white",
                    transition: "background 0.15s ease",
                  }}
                >
                  {/* 체크박스 */}
                  <div style={{ textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelect(d.id)}
                      style={{ accentColor: "var(--brand-600)", cursor: "pointer" }}
                      aria-label={`${d.title} 선택`}
                    />
                  </div>
                  {/* 어드민 전송 토글 */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <ToggleSwitch
                      on={!!d.metadata?.dab_send_intent}
                      busy={togglingId === d.id}
                      onToggle={() =>
                        handleToggleSendIntent(d, !d.metadata?.dab_send_intent)
                      }
                      label={`${d.title} 어드민 전송`}
                    />
                  </div>
                  {/* 썸네일 */}
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    {d.hero_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={d.hero_image_url}
                        alt=""
                        style={{
                          width: 52,
                          height: 36,
                          objectFit: "cover",
                          borderRadius: 6,
                          display: "block",
                          border: "1px solid var(--border-subtle)",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 52,
                          height: 36,
                          background: "var(--bg-muted)",
                          borderRadius: 6,
                          display: "grid",
                          placeItems: "center",
                          color: "var(--text-muted)",
                          fontSize: 14,
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        📄
                      </div>
                    )}
                  </div>
                  {/* 제목 / 작성자 */}
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
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {d.title}
                    </div>
                    <div
                      style={{
                        fontSize: 10.5,
                        color: "var(--text-muted)",
                        marginTop: 3,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>플라트라이프 에디터</span>
                      {d.primary_keyword && (
                        <>
                          <span style={{ color: "var(--border-default)" }}>·</span>
                          <span>🎯 {d.primary_keyword}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* 카테고리 */}
                  <span
                    style={{
                      fontSize: 10.5,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: "var(--brand-50, #eef2ff)",
                      color: "var(--brand-700, #4338ca)",
                      fontWeight: 600,
                      justifySelf: "start",
                      border: "1px solid var(--brand-200, #c7d2fe)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dabCategory}
                  </span>
                  {/* 전송 시점 (드롭다운) */}
                  <select
                    value={safeWhen(d.metadata?.dab_send_when)}
                    onChange={(e) => handleChangeWhen(d, e.target.value as DabSendWhen)}
                    disabled={d.metadata?.dab_send_status === "sent" || d.metadata?.dab_send_status === "sending"}
                    style={{
                      fontSize: 11.5,
                      padding: "5px 8px",
                      border: "1px solid var(--border-default)",
                      borderRadius: 6,
                      background: "white",
                      color: "var(--text-primary)",
                      cursor: d.metadata?.dab_send_status === "sent" ? "not-allowed" : "pointer",
                      width: "100%",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {DAB_SEND_WHEN_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {/* 전송 상태 */}
                  {(() => {
                    const sendStatus = d.metadata?.dab_send_status ?? "idle"
                    const meta = DAB_SEND_STATUS_LABEL[sendStatus]
                    /* queued 일 때 예약 시각 표시 (KST) */
                    const scheduledAt = d.metadata?.dab_send_scheduled_at
                    const scheduledLabel =
                      sendStatus === "queued" && scheduledAt
                        ? new Date(scheduledAt).toLocaleString("ko-KR", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })
                        : null
                    const titleText =
                      sendStatus === "failed"
                        ? d.metadata?.dab_send_error ?? "전송 실패"
                        : sendStatus === "queued" && scheduledAt
                        ? `예약: ${new Date(scheduledAt).toLocaleString("ko-KR")}`
                        : sendStatus === "sent" && d.metadata?.dab_send_at
                        ? `완료: ${new Date(d.metadata.dab_send_at).toLocaleString("ko-KR")}`
                        : undefined
                    return (
                      <span
                        title={titleText}
                        style={{
                          background: meta.bg,
                          color: meta.fg,
                          border: `1px solid ${meta.border}`,
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: 999,
                          justifySelf: "start",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          maxWidth: 110,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {meta.emoji && <span>{meta.emoji}</span>}
                        {scheduledLabel ?? meta.label}
                      </span>
                    )
                  })()}
                  {/* 업데이트 */}
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    {new Date(d.updated_at).toLocaleDateString("ko-KR", {
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

      {/* 발행 미리보기 모달 — 어드민/web 화면 미리보기만 */}
      {currentModal && (
        <PublishSettingModal
          draft={currentModal}
          onClose={() => setModalId(null)}
        />
      )}

      <style jsx>{`
        :global(.content-row:hover) {
          background: var(--bg-subtle);
        }
      `}</style>
      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
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
