"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { PageHeader } from "../_ui"

type Category = "location" | "campus" | "type" | "duration" | "option" | "situation" | "foreigner" | "seasonal"
type Competition = "low" | "medium" | "high" | "unknown"
type Sort = "total" | "pc" | "mobile" | "alpha"

interface Keyword {
  id: string
  label: string
  category: Category | null
  monthly_pc: number | null
  monthly_mobile: number | null
  monthly_total: number | null
  competition: Competition | null
  enriched_at: string | null
}

const CAT_META: Record<Category, { label: string; icon: string; color: string }> = {
  location: { label: "지역·동네", icon: "📍", color: "#3B82F6" },
  campus: { label: "대학 주변", icon: "🎓", color: "#8B5CF6" },
  type: { label: "매물 타입", icon: "🏠", color: "#0EA5E9" },
  duration: { label: "기간·계약", icon: "⏱", color: "#F59E0B" },
  option: { label: "옵션·편의", icon: "🛋", color: "#10B981" },
  situation: { label: "상황·니즈", icon: "🎯", color: "#EC4899" },
  foreigner: { label: "외국인·유학생", icon: "🌏", color: "#6366F1" },
  seasonal: { label: "시즌성", icon: "📅", color: "#F43F5E" },
}

const COMP_STYLE: Record<Competition, { label: string; bg: string; fg: string }> = {
  low: { label: "경쟁 낮음", bg: "#ECFDF5", fg: "#047857" },
  medium: { label: "경쟁 중간", bg: "#FFFBEB", fg: "#B45309" },
  high: { label: "경쟁 높음", bg: "#FEF2F2", fg: "#B91C1C" },
  unknown: { label: "—", bg: "#F3F4F6", fg: "#6B7280" },
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

export default function ResearchPage() {
  const [keywords, setKeywords] = useState<Keyword[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [activeCat, setActiveCat] = useState<"all" | Category>("all")
  const [sort, setSort] = useState<Sort>("total")
  const [search, setSearch] = useState("")

  const load = useCallback(
    async (s: Sort = sort) => {
      setLoading(true)
      try {
        const j = await safeFetchJson<{ ok: boolean; keywords?: Keyword[] }>(
          `/api/research/keywords?sort=${s}`,
          { cache: "no-store" }
        )
        if (j.ok) setKeywords(j.keywords ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류")
      } finally {
        setLoading(false)
      }
    },
    [sort]
  )

  useEffect(() => {
    load(sort)
  }, [load, sort])

  const visible = useMemo(() => {
    let list = keywords
    if (activeCat !== "all") list = list.filter((k) => k.category === activeCat)
    if (search.trim()) {
      const q = search.trim()
      list = list.filter((k) => k.label.includes(q))
    }
    return list
  }, [keywords, activeCat, search])

  const categoryCounts = useMemo(() => {
    const m: Record<string, number> = { all: keywords.length }
    for (const k of keywords) {
      const c = k.category ?? "etc"
      m[c] = (m[c] ?? 0) + 1
    }
    return m
  }, [keywords])

  /* 요약 지표 */
  const summary = useMemo(() => {
    const enriched = keywords.filter((k) => k.monthly_total != null)
    const totalVol = enriched.reduce((s, k) => s + (k.monthly_total ?? 0), 0)
    const top = [...enriched].sort((a, b) => (b.monthly_total ?? 0) - (a.monthly_total ?? 0))[0]
    const rising = enriched.filter((k) => k.competition === "low" && (k.monthly_total ?? 0) > 1000).length
    return {
      count: keywords.length,
      enriched: enriched.length,
      totalVol,
      topLabel: top?.label ?? "—",
      topVol: top?.monthly_total ?? 0,
      rising,
    }
  }, [keywords])

  const refreshVisible = async () => {
    const ids = visible.map((k) => k.id)
    if (ids.length === 0) return
    setRefreshing(true)
    try {
      const j = await safeFetchJson<{ ok: boolean; refreshed?: number; error?: string }>(
        "/api/research/refresh",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids }),
        }
      )
      if (!j.ok) throw new Error(j.error ?? "refresh 실패")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "새로고침 실패")
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 01 · TRENDS"
        title="키워드 트렌드"
        sub="단기임대 시장의 월 검색량·경쟁도를 관찰합니다. 실제 주제 생성·선정은 다음 단계(아이데이션)에서 이루어져요."
        actions={[
          {
            label: refreshing
              ? "새로고침 중…"
              : `🔄 현재 화면 수치 새로고침 (${visible.length})`,
            onClick: refreshVisible,
          },
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
          <button onClick={() => setError(null)} style={{ color: "var(--danger-fg)", background: "transparent", border: 0 }}>
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
        <SummaryTile label="트래킹 키워드" value={`${summary.count}개`} sub={`실측 수치 ${summary.enriched}개`} />
        <SummaryTile label="전체 월 검색량" value={summary.totalVol.toLocaleString()} sub="합계" accent />
        <SummaryTile
          label="TOP 키워드"
          value={summary.topLabel}
          sub={summary.topVol > 0 ? `월 ${summary.topVol.toLocaleString()}회` : "—"}
        />
        <SummaryTile label="저경쟁 기회" value={`${summary.rising}개`} sub="월 1K+ · 경쟁 낮음" />
      </div>

      {/* 카테고리 필터 */}
      <div className="bcard" style={{ marginBottom: 14 }}>
        <div style={{ padding: "14px 16px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <CatChip
            label="전체"
            icon="✨"
            color="#0F172A"
            active={activeCat === "all"}
            count={categoryCounts.all}
            onClick={() => setActiveCat("all")}
          />
          {(Object.keys(CAT_META) as Category[]).map((c) => (
            <CatChip
              key={c}
              label={CAT_META[c].label}
              icon={CAT_META[c].icon}
              color={CAT_META[c].color}
              active={activeCat === c}
              count={categoryCounts[c] ?? 0}
              onClick={() => setActiveCat(c)}
            />
          ))}
        </div>
        <div
          style={{
            padding: "10px 16px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            placeholder="🔍 키워드 검색…"
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
          <div style={{ display: "flex", gap: 4 }}>
            {(
              [
                { k: "total", l: "월 합계" },
                { k: "pc", l: "PC" },
                { k: "mobile", l: "모바일" },
                { k: "alpha", l: "이름순" },
              ] as const
            ).map((s) => (
              <button
                key={s.k}
                onClick={() => setSort(s.k)}
                className={`bbtn ${sort === s.k ? "bbtn--primary" : "bbtn--ghost"} bbtn--sm`}
              >
                {s.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 키워드 테이블 */}
      <div className="bcard">
        <div className="bcard__header">
          <div>
            <div className="bcard__title">키워드 목록</div>
            <div className="bcard__sub">
              {loading ? "불러오는 중…" : `${visible.length}개 표시`}
            </div>
          </div>
        </div>
        <div style={{ overflow: "auto" }}>
          <table className="btbl">
            <thead>
              <tr>
                <th>키워드</th>
                <th style={{ width: 110 }}>카테고리</th>
                <th style={{ width: 80, textAlign: "right" }}>PC</th>
                <th style={{ width: 90, textAlign: "right" }}>모바일</th>
                <th style={{ width: 100, textAlign: "right" }}>월 합계</th>
                <th style={{ width: 100 }}>경쟁도</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((k) => {
                const cat = k.category ? CAT_META[k.category] : null
                const comp = COMP_STYLE[k.competition ?? "unknown"]
                return (
                  <tr key={k.id}>
                    <td style={{ fontWeight: 600 }}>{k.label}</td>
                    <td>
                      {cat && (
                        <span
                          className="bchip"
                          style={{
                            background: cat.color + "18",
                            color: cat.color,
                            fontSize: 10.5,
                          }}
                        >
                          {cat.icon} {cat.label}
                        </span>
                      )}
                    </td>
                    <td className="text-mono" style={{ textAlign: "right", color: "var(--text-tertiary)" }}>
                      {k.monthly_pc?.toLocaleString() ?? "—"}
                    </td>
                    <td className="text-mono" style={{ textAlign: "right", color: "var(--text-tertiary)" }}>
                      {k.monthly_mobile?.toLocaleString() ?? "—"}
                    </td>
                    <td
                      className="text-mono"
                      style={{ textAlign: "right", fontWeight: 700, fontSize: 13 }}
                    >
                      {k.monthly_total?.toLocaleString() ?? "—"}
                    </td>
                    <td>
                      <span
                        className="bchip"
                        style={{
                          background: comp.bg,
                          color: comp.fg,
                          fontSize: 10.5,
                        }}
                      >
                        {comp.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {visible.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)" }}>
                    조건에 맞는 키워드가 없어요
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div
      style={{
        background: accent ? "var(--brand-50)" : "var(--bg-surface)",
        border: `1px solid ${accent ? "var(--brand-200)" : "var(--border-default)"}`,
        borderRadius: "var(--r-lg)",
        padding: "14px 16px",
      }}
    >
      <div style={{ fontSize: 10.5, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          marginTop: 4,
          color: accent ? "var(--brand-700)" : "var(--text-primary)",
          letterSpacing: "-.01em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
        title={value}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

function CatChip({
  label,
  icon,
  color,
  count,
  active,
  onClick,
}: {
  label: string
  icon: string
  color: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="bbtn"
      style={{
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 500,
        background: active ? color : "var(--bg-muted)",
        color: active ? "white" : "var(--text-secondary)",
        border: active ? `1px solid ${color}` : "1px solid transparent",
      }}
    >
      <span>{icon}</span>
      {label}
      <span
        style={{
          fontSize: 10.5,
          fontWeight: 600,
          padding: "1px 6px",
          borderRadius: 8,
          background: active ? "rgba(255,255,255,.25)" : "var(--bg-surface)",
          color: active ? "white" : "var(--text-tertiary)",
          marginLeft: 2,
        }}
      >
        {count}
      </span>
    </button>
  )
}
