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
  created_at: string
  updated_at: string
}

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  approved: { label: "저장됨", color: "#047857", bg: "#ecfdf5" },
  published: { label: "발행됨", color: "#1d4ed8", bg: "#eff6ff" },
  drafting: { label: "작성 중", color: "#92400e", bg: "#fffbeb" },
  reviewing: { label: "검수 중", color: "#7c3aed", bg: "#f5f3ff" },
  rewriting: { label: "재작성", color: "#92400e", bg: "#fffbeb" },
  discarded: { label: "폐기", color: "#6b7280", bg: "#f3f4f6" },
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
  const [contents, setContents] = useState<DraftItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "approved" | "published">("all")
  const [search, setSearch] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [a, p] = await Promise.all([
        safeFetchJson<{ ok: boolean; drafts?: DraftItem[] }>(
          "/api/drafts?status=approved&limit=100",
          { cache: "no-store" }
        ),
        safeFetchJson<{ ok: boolean; drafts?: DraftItem[] }>(
          "/api/drafts?status=published&limit=100",
          { cache: "no-store" }
        ),
      ])
      const combined = [...(a.drafts ?? []), ...(p.drafts ?? [])].sort(
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
      published: contents.filter((d) => d.status === "published").length,
    }
  }, [contents])

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="콘텐츠 관리"
        title="저장된 콘텐츠"
        sub="검수에서 저장된 글들을 관리합니다. 편집하거나 발행 단계로 넘길 수 있어요."
        actions={[
          { label: "← 검수", onClick: () => router.push("/blog/review") },
          { label: "발행으로 →", primary: true, onClick: () => router.push("/blog/publish") },
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

      {/* 요약 KPI */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 14,
        }}
      >
        <SummaryTile label="전체" value={counts.all} />
        <SummaryTile label="저장됨 (미발행)" value={counts.approved} accent />
        <SummaryTile label="발행됨" value={counts.published} />
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
                { k: "approved", l: "저장됨" },
                { k: "published", l: "발행됨" },
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
                    background:
                      filter === t.k ? "rgba(255,255,255,.25)" : "var(--bg-muted)",
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
              return (
                <Link
                  key={d.id}
                  href={`/blog/contents/${d.id}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 110px 130px 80px",
                    gap: 12,
                    alignItems: "center",
                    padding: "14px 20px",
                    borderBottom: "1px solid var(--border-subtle)",
                    textDecoration: "none",
                    color: "inherit",
                    cursor: "pointer",
                    transition: "background 0.1s",
                  }}
                  className="content-row"
                >
                  <div style={{ minWidth: 0 }}>
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
                      fontSize: 10.5,
                      fontWeight: 600,
                    }}
                  >
                    {st.label}
                  </span>
                  <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                    {new Date(d.updated_at).toLocaleDateString("ko-KR", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <button
                    className="bbtn bbtn--ghost bbtn--sm"
                    style={{ justifySelf: "end" }}
                    onClick={(e) => {
                      e.preventDefault()
                      router.push(`/blog/contents/${d.id}`)
                    }}
                  >
                    <Icon name="pen" size={11} /> 편집
                  </button>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        :global(.content-row:hover) {
          background: var(--bg-subtle);
        }
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
  accent?: boolean
}) {
  return (
    <div
      style={{
        background: accent ? "var(--brand-50)" : "var(--bg-surface)",
        border: `1px solid ${accent ? "var(--brand-200)" : "var(--border-default)"}`,
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
          color: accent ? "var(--brand-700)" : "var(--text-primary)",
          letterSpacing: "-.01em",
        }}
      >
        {value}개
      </div>
    </div>
  )
}
