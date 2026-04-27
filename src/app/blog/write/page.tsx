"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon, PageHeader } from "../_ui"
import { readCache, writeCache } from "../_lib/cache"

interface TopicItem {
  id: string
  title: string
  primary_keyword: string | null
  target_kpi: string | null
  status: string
  finalized_at: string | null
  created_at: string
}

interface DraftItem {
  id: string
  topic_id: string | null
  title: string
  status: string
  progress_pct: number | null
  primary_keyword: string | null
  metadata: { hero_image_url?: string | null } | null
  hero_image_url?: string | null
  body_markdown?: string | null
  updated_at: string
}

async function safeFetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const r = await fetch(input, { cache: "no-store", ...init })
  const text = await r.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(r.ok ? "응답 파싱 실패" : `HTTP ${r.status}`)
  }
}

/* 콘텐츠 상태 추론 */
function statusOf(t: TopicItem, draft?: DraftItem): {
  label: string
  fg: string
  bg: string
  border: string
} {
  if (!draft) {
    return { label: "본문 미작성", fg: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" }
  }
  if (draft.status === "drafting" || draft.status === "rewriting") {
    return { label: "작성 중", fg: "#92400e", bg: "#fffbeb", border: "#fde68a" }
  }
  if (draft.status === "reviewing") {
    return { label: "검수 대기", fg: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" }
  }
  if (draft.status === "approved" || draft.status === "scheduled") {
    return { label: "검수 완료", fg: "#047857", bg: "#ecfdf5", border: "#a7f3d0" }
  }
  if (draft.status === "published") {
    return { label: "발행됨", fg: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" }
  }
  return { label: draft.status, fg: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" }
}

export default function WriteListPage() {
  const router = useRouter()
  const cachedTopics = useMemo(() => readCache<TopicItem[]>("write-topics"), [])
  const cachedDrafts = useMemo(() => readCache<DraftItem[]>("write-drafts"), [])
  const [topics, setTopics] = useState<TopicItem[]>(() => cachedTopics ?? [])
  const [drafts, setDrafts] = useState<DraftItem[]>(
    () => cachedDrafts?.filter((d) => d.status !== "discarded") ?? []
  )
  const [loading, setLoading] = useState(!cachedTopics || !cachedDrafts)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "todo" | "drafting" | "ready" | "trash">("all")
  const [busyId, setBusyId] = useState<string | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [trashedDrafts, setTrashedDrafts] = useState<DraftItem[]>(
    () => cachedDrafts?.filter((d) => d.status === "discarded") ?? []
  )
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    try {
      /* 1번 호출: 전 status 한 번에 (drafts), topics 별도 1번 */
      const [t, d] = await Promise.all([
        safeFetchJson<{ ok: boolean; topics?: TopicItem[] }>("/api/topics?limit=200"),
        safeFetchJson<{ ok: boolean; drafts?: DraftItem[] }>(
          "/api/drafts?statuses=drafting,reviewing,approved,scheduled,published,rewriting,discarded&limit=400"
        ),
      ])
      const tList = t.topics ?? []
      const dList = d.drafts ?? []
      writeCache("write-topics", tList)
      writeCache("write-drafts", dList)
      setTopics(tList)
      setDrafts(dList.filter((x) => x.status !== "discarded"))
      setTrashedDrafts(dList.filter((x) => x.status === "discarded"))
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류")
    } finally {
      setLoading(false)
    }
  }, [])

  /** mutation 후 캐시 즉시 동기화 */
  const syncCacheNow = useCallback(
    (
      nextTopics: TopicItem[],
      nextActiveDrafts: DraftItem[],
      nextTrashedDrafts: DraftItem[]
    ) => {
      writeCache("write-topics", nextTopics)
      writeCache("write-drafts", [...nextActiveDrafts, ...nextTrashedDrafts])
    },
    []
  )

  useEffect(() => {
    load()
  }, [load])

  const draftByTopic = useMemo(
    () => new Map(drafts.filter((d) => d.topic_id).map((d) => [d.topic_id!, d])),
    [drafts]
  )

  const allRows = useMemo(() => {
    return topics
      .filter((t) => t.status === "approved" || t.status === "draft")
      .map((t) => ({ topic: t, draft: draftByTopic.get(t.id) }))
  }, [topics, draftByTopic])

  /* 휴지통 행: archived topics + discarded drafts (topic 정보와 함께) */
  const trashRows = useMemo(() => {
    const rows: Array<{ topic: TopicItem; draft?: DraftItem; kind: "topic" | "draft" }> = []
    /* archived topics */
    for (const t of topics) {
      if (t.status === "archived") {
        rows.push({ topic: t, draft: draftByTopic.get(t.id), kind: "topic" })
      }
    }
    /* discarded drafts whose topic is still active (topic 자체는 휴지통 아님) */
    for (const d of trashedDrafts) {
      if (!d.topic_id) continue
      const t = topics.find((x) => x.id === d.topic_id)
      if (!t || t.status === "archived") continue
      rows.push({ topic: t, draft: d, kind: "draft" })
    }
    return rows.sort((a, b) =>
      (b.draft?.updated_at ?? b.topic.created_at).localeCompare(
        a.draft?.updated_at ?? a.topic.created_at
      )
    )
  }, [topics, trashedDrafts, draftByTopic])

  const visible = useMemo(() => {
    let list: Array<{ topic: TopicItem; draft?: DraftItem; kind?: "topic" | "draft" }> =
      filter === "trash" ? trashRows : allRows
    if (filter === "todo") list = list.filter((r) => !r.draft)
    if (filter === "drafting")
      list = list.filter(
        (r) => r.draft && (r.draft.status === "drafting" || r.draft.status === "rewriting")
      )
    if (filter === "ready")
      list = list.filter(
        (r) =>
          r.draft &&
          (r.draft.status === "approved" ||
            r.draft.status === "scheduled" ||
            r.draft.status === "published" ||
            r.draft.status === "reviewing")
      )
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((r) => r.topic.title.toLowerCase().includes(q))
    }
    return list
  }, [allRows, trashRows, filter, search])

  const counts = useMemo(() => {
    const todo = allRows.filter((r) => !r.draft).length
    const drafting = allRows.filter(
      (r) => r.draft && (r.draft.status === "drafting" || r.draft.status === "rewriting")
    ).length
    const ready = allRows.filter(
      (r) =>
        r.draft &&
        (r.draft.status === "approved" ||
          r.draft.status === "scheduled" ||
          r.draft.status === "published" ||
          r.draft.status === "reviewing")
    ).length
    return { all: allRows.length, todo, drafting, ready, trash: trashRows.length }
  }, [allRows, trashRows])

  const isTrashView = filter === "trash"

  /* 선택 관리 — 필터 바뀌면 초기화 */
  useEffect(() => {
    setSelectedKeys(new Set())
  }, [filter])

  const toggleSelect = (id: string) => {
    setSelectedKeys((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  const toggleAllVisible = () => {
    const ids = visible.map((r) => r.topic.id)
    setSelectedKeys((prev) => {
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

  /* 본문 이미지 카운트 */
  const countBodyImages = (md?: string | null): number => {
    if (!md) return 0
    const m = md.match(/!\[[^\]]*\]\(https?:\/\/[^)]+\)/g)
    return m?.length ?? 0
  }

  /* 다중 선택 휴지통 이동 — optimistic */
  const handleBulkDelete = async () => {
    if (selectedKeys.size === 0) return
    if (
      !confirm(
        `선택한 ${selectedKeys.size}개를 휴지통으로 보낼까요?\n\n(휴지통 탭에서 복원할 수 있어요)`
      )
    )
      return
    const ids = Array.from(selectedKeys)
    const targets = ids
      .map((topicId) => allRows.find((r) => r.topic.id === topicId))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))

    /* 낙관적 업데이트 + cache sync */
    const movedDrafts: DraftItem[] = []
    const archivedTopicIds = new Set<string>()
    for (const row of targets) {
      if (row.draft) {
        movedDrafts.push({ ...row.draft, status: "discarded" })
      } else {
        archivedTopicIds.add(row.topic.id)
      }
    }
    const movedIds = new Set(movedDrafts.map((d) => d.id))
    const nextDrafts =
      movedDrafts.length > 0 ? drafts.filter((d) => !movedIds.has(d.id)) : drafts
    const nextTrashedDrafts =
      movedDrafts.length > 0 ? [...movedDrafts, ...trashedDrafts] : trashedDrafts
    const nextTopics =
      archivedTopicIds.size > 0
        ? topics.map((t) =>
            archivedTopicIds.has(t.id) ? { ...t, status: "archived" } : t
          )
        : topics
    setDrafts(nextDrafts)
    setTrashedDrafts(nextTrashedDrafts)
    setTopics(nextTopics)
    syncCacheNow(nextTopics, nextDrafts, nextTrashedDrafts)
    setSelectedKeys(new Set())
    setBulkBusy(true)
    try {
      await Promise.all(
        targets.map((row) => {
          const url = row.draft
            ? `/api/drafts/${row.draft.id}`
            : `/api/topics/${row.topic.id}`
          return fetch(url, { method: "DELETE" })
        })
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : "일괄 삭제 실패")
      await load()
    } finally {
      setBulkBusy(false)
    }
  }

  /** 행 단위 삭제 — optimistic + cache sync */
  const handleDelete = async (
    row: { topic: TopicItem; draft?: DraftItem }
  ) => {
    const titleClip = row.topic.title.slice(0, 40) + (row.topic.title.length > 40 ? "…" : "")
    const msg = row.draft
      ? `"${titleClip}" 작성된 본문을 삭제할까요?\n\n(휴지통으로 이동 — 휴지통 탭에서 복원 가능)`
      : `"${titleClip}" 주제를 삭제할까요?\n\n(휴지통으로 이동 — 휴지통 탭에서 복원 가능)`
    if (!confirm(msg)) return
    let nextTopics = topics
    let nextDrafts = drafts
    let nextTrashedDrafts = trashedDrafts
    if (row.draft) {
      const moved = { ...row.draft, status: "discarded" }
      nextDrafts = drafts.filter((d) => d.id !== row.draft!.id)
      nextTrashedDrafts = [moved, ...trashedDrafts]
    } else {
      nextTopics = topics.map((t) =>
        t.id === row.topic.id ? { ...t, status: "archived" } : t
      )
    }
    setTopics(nextTopics)
    setDrafts(nextDrafts)
    setTrashedDrafts(nextTrashedDrafts)
    syncCacheNow(nextTopics, nextDrafts, nextTrashedDrafts)
    try {
      const url = row.draft ? `/api/drafts/${row.draft.id}` : `/api/topics/${row.topic.id}`
      const j = await safeFetchJson<{ ok: boolean; error?: string }>(url, { method: "DELETE" })
      if (!j.ok) throw new Error(j.error ?? "삭제 실패")
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패")
      await load()
    } finally {
      setBusyId(null)
    }
  }

  /** 휴지통에서 복원 — optimistic + cache sync */
  const handleRestore = async (row: { topic: TopicItem; draft?: DraftItem; kind?: "topic" | "draft" }) => {
    let nextTopics = topics
    let nextDrafts = drafts
    let nextTrashedDrafts = trashedDrafts
    if (row.kind === "draft" && row.draft) {
      const restored = { ...row.draft, status: "drafting" }
      nextTrashedDrafts = trashedDrafts.filter((d) => d.id !== row.draft!.id)
      nextDrafts = [restored, ...drafts]
    } else {
      nextTopics = topics.map((t) =>
        t.id === row.topic.id ? { ...t, status: "approved" } : t
      )
    }
    setTopics(nextTopics)
    setDrafts(nextDrafts)
    setTrashedDrafts(nextTrashedDrafts)
    syncCacheNow(nextTopics, nextDrafts, nextTrashedDrafts)
    try {
      if (row.kind === "draft" && row.draft) {
        await fetch(`/api/drafts/${row.draft.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "drafting" }),
        })
      } else {
        await fetch(`/api/topics/${row.topic.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "복원 실패")
      await load()
    }
  }

  /** 휴지통에서 영구 삭제 — optimistic + cache sync */
  const handleHardDelete = async (
    row: { topic: TopicItem; draft?: DraftItem; kind?: "topic" | "draft" }
  ) => {
    const titleClip = row.topic.title.slice(0, 40) + (row.topic.title.length > 40 ? "…" : "")
    if (
      !confirm(`"${titleClip}" 영구 삭제할까요?\n\n⚠️ 복원할 수 없어요. 본문·이미지·관련 이력 모두 사라집니다.`)
    )
      return
    let nextTopics = topics
    let nextTrashedDrafts = trashedDrafts
    if (row.kind === "draft" && row.draft) {
      nextTrashedDrafts = trashedDrafts.filter((d) => d.id !== row.draft!.id)
    } else {
      nextTopics = topics.filter((t) => t.id !== row.topic.id)
    }
    setTopics(nextTopics)
    setTrashedDrafts(nextTrashedDrafts)
    syncCacheNow(nextTopics, drafts, nextTrashedDrafts)
    try {
      if (row.kind === "draft" && row.draft) {
        await fetch(`/api/drafts/${row.draft.id}?hard=1`, { method: "DELETE" })
      } else {
        await fetch(`/api/topics/${row.topic.id}?hard=1`, { method: "DELETE" })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "영구삭제 실패")
      await load()
    }
  }

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 04 · CREATE"
        title="콘텐츠 제작"
        sub="브리프 작성에서 확정된 주제를 본문으로 작성합니다. 행을 클릭하면 에디터가 열려요."
        actions={[
          { label: "← 브리프 작성", href: "/blog/topics" },
          { label: "검수로 →", primary: true, href: "/blog/review" },
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
            style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* 요약 KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <Tile label="전체" value={counts.all} />
        <Tile label="본문 미작성" value={counts.todo} accent="amber" />
        <Tile label="작성 중" value={counts.drafting} accent="amber" />
        <Tile label="검수·완료" value={counts.ready} accent="emerald" />
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
                { k: "all", l: "전체" },
                { k: "todo", l: "본문 미작성" },
                { k: "drafting", l: "작성 중" },
                { k: "ready", l: "완료·검수 대기" },
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
            {/* 휴지통 별도 — 시각 분리 */}
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
                    filter === "trash"
                      ? "white"
                      : counts.trash > 0
                      ? "#991b1b"
                      : "var(--text-tertiary)",
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

      {/* 칼럼 테이블 */}
      <div className="bcard">
        <div className="bcard__header">
          <div>
            <div className="bcard__title">콘텐츠 목록</div>
            <div className="bcard__sub">
              {loading ? "불러오는 중…" : `${visible.length}개 표시`}
            </div>
          </div>
        </div>

        {visible.length === 0 && !loading ? (
          <div
            style={{
              padding: "60px 24px",
              textAlign: "center",
              fontSize: 13,
              color: "var(--text-muted)",
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>
              {isTrashView ? "🗑" : "✍️"}
            </div>
            {isTrashView ? (
              <>휴지통이 비어있어요.</>
            ) : (
              <>
                {filter === "all"
                  ? "아직 확정된 주제가 없어요."
                  : "해당 상태의 콘텐츠가 없어요."}
                <br />
                먼저{" "}
                <Link href="/blog/topics" style={{ color: "var(--brand-600)", fontWeight: 600 }}>
                  브리프 작성
                </Link>
                에서 브리프를 만들고 확정해주세요.
              </>
            )}
          </div>
        ) : (
          <div>
            {/* 다중 선택 액션바 */}
            {!isTrashView && selectedKeys.size > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 20px",
                  background: "var(--brand-50)",
                  borderBottom: "1px solid var(--brand-200)",
                  fontSize: 12.5,
                }}
              >
                <span style={{ fontWeight: 700, color: "var(--brand-700)" }}>
                  ✓ {selectedKeys.size}개 선택됨
                </span>
                <button
                  className="bbtn bbtn--ghost bbtn--sm"
                  onClick={() => setSelectedKeys(new Set())}
                  style={{ marginLeft: "auto" }}
                >
                  선택 해제
                </button>
                <button
                  className="bbtn bbtn--sm"
                  onClick={handleBulkDelete}
                  disabled={bulkBusy}
                  style={{ background: "#991b1b", color: "white", border: "1px solid #991b1b" }}
                >
                  {bulkBusy ? "이동 중…" : `🗑 휴지통으로 (${selectedKeys.size})`}
                </button>
              </div>
            )}

            {/* 헤더 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isTrashView
                  ? "1fr 130px 70px 80px 80px 200px"
                  : "32px 1fr 130px 70px 80px 80px 180px",
                gap: 12,
                alignItems: "center",
                padding: "10px 20px",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-muted)",
                background: "var(--bg-subtle)",
                borderBottom: "1px solid var(--border-default)",
                textTransform: "uppercase",
                letterSpacing: ".04em",
              }}
            >
              {!isTrashView && (
                <div style={{ textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={
                      visible.length > 0 &&
                      visible.every((r) => selectedKeys.has(r.topic.id))
                    }
                    onChange={toggleAllVisible}
                    style={{ accentColor: "var(--brand-600)", cursor: "pointer" }}
                    aria-label="전체 선택"
                  />
                </div>
              )}
              <div>제목</div>
              <div>상태</div>
              <div style={{ textAlign: "center" }}>썸네일</div>
              <div style={{ textAlign: "center" }}>본문 이미지</div>
              <div style={{ textAlign: "center" }}>진행률</div>
              <div style={{ textAlign: "right" }}>액션</div>
            </div>

            {visible.map((row) => {
              const t = row.topic
              const draft = row.draft
              const kind = "kind" in row ? row.kind : undefined
              const st = isTrashView
                ? {
                    label: kind === "draft" ? "본문 휴지통" : "주제 휴지통",
                    fg: "#991b1b",
                    bg: "#fef2f2",
                    border: "#fecaca",
                  }
                : statusOf(t, draft)
              const hasThumb = !!(draft?.hero_image_url || draft?.metadata?.hero_image_url)
              const bodyImgs = countBodyImages(draft?.body_markdown)
              const progress = draft?.progress_pct ?? (draft ? 100 : 0)
              const checked = selectedKeys.has(t.id)
              return (
                <div
                  key={t.id}
                  className="write-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: isTrashView
                      ? "1fr 130px 70px 80px 80px 200px"
                      : "32px 1fr 130px 70px 80px 80px 180px",
                    gap: 12,
                    alignItems: "center",
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border-subtle)",
                    background: checked ? "var(--brand-50)" : undefined,
                  }}
                >
                  {!isTrashView && (
                    <div style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(t.id)}
                        style={{ accentColor: "var(--brand-600)", cursor: "pointer" }}
                        aria-label={`${t.title} 선택`}
                      />
                    </div>
                  )}
                  {/* 제목 */}
                  <div
                    onClick={() => {
                      if (!isTrashView) router.push(`/blog/write/${t.id}`)
                    }}
                    style={{ cursor: isTrashView ? "default" : "pointer", minWidth: 0 }}
                  >
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 600,
                        lineHeight: 1.4,
                        marginBottom: 3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.title}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {t.primary_keyword && (
                        <span
                          className="bchip bchip--brand"
                          style={{ fontSize: 10, padding: "1px 7px" }}
                        >
                          🎯 {t.primary_keyword}
                        </span>
                      )}
                      {t.target_kpi && (
                        <span className="bchip" style={{ fontSize: 10, padding: "1px 7px" }}>
                          {t.target_kpi}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 상태 */}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 999,
                      background: st.bg,
                      color: st.fg,
                      border: `1px solid ${st.border}`,
                      width: "fit-content",
                    }}
                  >
                    {st.label}
                  </span>

                  {/* 썸네일 */}
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: hasThumb ? "var(--brand-700)" : "var(--text-muted)",
                    }}
                    title={hasThumb ? "썸네일 1개" : "없음"}
                  >
                    {hasThumb ? "1" : "—"}
                  </div>

                  {/* 본문 이미지 */}
                  <div
                    style={{
                      textAlign: "center",
                      fontSize: 13,
                      fontWeight: 700,
                      color: bodyImgs > 0 ? "var(--brand-700)" : "var(--text-muted)",
                    }}
                    title={bodyImgs > 0 ? `본문 이미지 ${bodyImgs}개` : "없음"}
                  >
                    {bodyImgs > 0 ? bodyImgs : "—"}
                  </div>

                  {/* 진행률 */}
                  <div>
                    {draft ? (
                      <div>
                        <div className="bar-track" style={{ height: 4 }}>
                          <div className="bar-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <div
                          style={{
                            fontSize: 10.5,
                            textAlign: "center",
                            marginTop: 3,
                            color: "var(--text-muted)",
                            fontFamily: "ui-monospace, monospace",
                          }}
                        >
                          {progress}%
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                        —
                      </div>
                    )}
                  </div>

                  {/* 액션 */}
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    {isTrashView ? (
                      <>
                        <button
                          className="bbtn bbtn--ghost bbtn--sm"
                          onClick={() => handleRestore(row)}
                          disabled={busyId === (draft?.id ?? t.id)}
                          title="복원"
                        >
                          ↩️ 복원
                        </button>
                        <button
                          className="bbtn bbtn--sm"
                          onClick={() => handleHardDelete(row)}
                          disabled={busyId === (draft?.id ?? t.id)}
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
                        <Link
                          href={`/blog/write/${t.id}`}
                          className="bbtn bbtn--primary bbtn--sm"
                          title={draft ? "에디터 열기" : "작성 시작"}
                        >
                          {draft ? (
                            <>
                              <Icon name="pen" size={11} /> 편집
                            </>
                          ) : (
                            <>
                              <Icon name="sparkles" size={11} /> 작성 시작
                            </>
                          )}
                        </Link>
                        <button
                          className="bbtn bbtn--ghost bbtn--sm"
                          onClick={() => handleDelete(row)}
                          disabled={busyId === (draft?.id ?? t.id)}
                          title={
                            draft
                              ? "본문 삭제 (휴지통으로 이동)"
                              : "주제 삭제 (휴지통으로 이동)"
                          }
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

      <style jsx global>{`
        .write-row:hover {
          background: var(--bg-subtle);
        }
      `}</style>
    </div>
  )
}

function Tile({
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
    amber: { bg: "#fffbeb", border: "#fde68a", fg: "#b45309" },
    blue: { bg: "#eff6ff", border: "#bfdbfe", fg: "#1d4ed8" },
  }
  const p = accent
    ? palette[accent]
    : { bg: "var(--bg-surface)", border: "var(--border-default)", fg: "var(--text-primary)" }
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
