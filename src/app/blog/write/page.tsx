"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon, PageHeader } from "../_ui"

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
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "todo" | "drafting" | "ready">("all")
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, d] = await Promise.all([
        safeFetchJson<{ ok: boolean; topics?: TopicItem[] }>("/api/topics?limit=50"),
        safeFetchJson<{ ok: boolean; drafts?: DraftItem[] }>("/api/drafts?limit=100"),
      ])
      setTopics(t.topics ?? [])
      setDrafts(d.drafts ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류")
    } finally {
      setLoading(false)
    }
  }, [])

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

  const visible = useMemo(() => {
    let list = allRows
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
  }, [allRows, filter, search])

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
    return { all: allRows.length, todo, drafting, ready }
  }, [allRows])

  const handleDelete = async (draftId: string, title: string) => {
    if (
      !confirm(
        `"${title.slice(0, 40)}${
          title.length > 40 ? "…" : ""
        }" 작성된 본문을 삭제할까요?\n\n(휴지통으로 이동 — 콘텐츠 관리 → 휴지통에서 복원 가능)`
      )
    )
      return
    setBusyId(draftId)
    try {
      const j = await safeFetchJson<{ ok: boolean; error?: string }>(
        `/api/drafts/${draftId}`,
        { method: "DELETE" }
      )
      if (!j.ok) throw new Error(j.error ?? "삭제 실패")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패")
    } finally {
      setBusyId(null)
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
          <div style={{ display: "flex", gap: 4 }}>
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
            <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>✍️</div>
            {filter === "all"
              ? "아직 확정된 주제가 없어요."
              : "해당 상태의 콘텐츠가 없어요."}
            <br />
            먼저{" "}
            <Link href="/blog/topics" style={{ color: "var(--brand-600)", fontWeight: 600 }}>
              브리프 작성
            </Link>
            에서 브리프를 만들고 확정해주세요.
          </div>
        ) : (
          <div>
            {/* 헤더 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 130px 90px 90px 200px",
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
              <div>제목</div>
              <div>상태</div>
              <div style={{ textAlign: "center" }}>이미지</div>
              <div style={{ textAlign: "center" }}>진행률</div>
              <div style={{ textAlign: "right" }}>액션</div>
            </div>

            {visible.map(({ topic: t, draft }) => {
              const st = statusOf(t, draft)
              const hasImg = !!(draft?.hero_image_url || draft?.metadata?.hero_image_url)
              const progress = draft?.progress_pct ?? (draft ? 100 : 0)
              return (
                <div
                  key={t.id}
                  className="write-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 130px 90px 90px 200px",
                    gap: 12,
                    alignItems: "center",
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}
                >
                  {/* 제목 */}
                  <div
                    onClick={() => router.push(`/blog/write/${t.id}`)}
                    style={{ cursor: "pointer", minWidth: 0 }}
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

                  {/* 이미지 */}
                  <div style={{ textAlign: "center", fontSize: 18 }}>
                    {hasImg ? (
                      <span title="썸네일·이미지 있음">🖼</span>
                    ) : (
                      <span style={{ color: "var(--text-muted)", fontSize: 12 }}>—</span>
                    )}
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
                    {draft && (
                      <button
                        className="bbtn bbtn--ghost bbtn--sm"
                        onClick={() => handleDelete(draft.id, t.title)}
                        disabled={busyId === draft.id}
                        title="본문 삭제 (휴지통으로 이동)"
                        style={{ color: "var(--danger-fg)", padding: "4px 8px" }}
                      >
                        🗑
                      </button>
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
