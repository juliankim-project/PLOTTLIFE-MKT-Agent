"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Icon, PageHeader } from "../_ui"

interface DraftLite {
  id: string
  title: string
  status: string
  progress_pct: number | null
  updated_at: string
  primary_keyword: string | null
}

interface ReviewItem {
  label: string
  ok: boolean
  severity?: "info" | "warning" | "error"
  detail?: string | null
  suggestion?: string | null
}

interface ReviewCategory {
  cat: "SEO" | "팩트·출처" | "톤 & 브랜드"
  score: number
  items: ReviewItem[]
}

interface SourceCheck {
  urls_found?: number
  suspicious_urls?: string[]
  missing_citations?: string[]
  date_inconsistencies?: string[]
  overall_note?: string
}

interface ReviewRecord {
  id: string
  draft_id: string
  overall_score: number
  status: string
  reviewer: string | null
  created_at: string
  items: {
    flat?: ReviewItem[]
    categories?: ReviewCategory[]
    source_check?: SourceCheck
    summary?: string
  }
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

const FIXED_CATS: Array<ReviewCategory["cat"]> = ["SEO", "팩트·출처", "톤 & 브랜드"]
const CAT_META: Record<
  ReviewCategory["cat"],
  { emoji: string; desc: string; color: string }
> = {
  SEO: { emoji: "🔎", desc: "검색·구조·메타", color: "#3B82F6" },
  "팩트·출처": { emoji: "📚", desc: "출처·수치·허위정보 검증", color: "#EA580C" },
  "톤 & 브랜드": { emoji: "🗣", desc: "플라트 보이스·난이도", color: "#7C3AED" },
}

export default function ReviewPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<DraftLite[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [review, setReview] = useState<ReviewRecord | null>(null)
  const [loadingDrafts, setLoadingDrafts] = useState(true)
  const [loadingReview, setLoadingReview] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quality, setQuality] = useState<"flash" | "pro">("flash")

  /* 검수 대상 drafts 로드 */
  const loadDrafts = useCallback(async () => {
    setLoadingDrafts(true)
    try {
      const [a, b] = await Promise.all([
        safeFetchJson<{ ok: boolean; drafts?: DraftLite[] }>(
          "/api/drafts?status=drafting&limit=20",
          { cache: "no-store" }
        ),
        safeFetchJson<{ ok: boolean; drafts?: DraftLite[] }>(
          "/api/drafts?status=reviewing&limit=20",
          { cache: "no-store" }
        ),
      ])
      const combined = [...(a.drafts ?? []), ...(b.drafts ?? [])].sort((x, y) =>
        y.updated_at.localeCompare(x.updated_at)
      )
      setDrafts(combined)
      if (combined.length > 0 && !selectedId) setSelectedId(combined[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류")
    } finally {
      setLoadingDrafts(false)
    }
  }, [selectedId])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  /* 선택된 draft 의 기존 review 로드 */
  const loadReview = useCallback(async (id: string) => {
    setLoadingReview(true)
    setReview(null)
    try {
      const j = await safeFetchJson<{ ok: boolean; review?: ReviewRecord | null }>(
        `/api/reviews?draftId=${id}`,
        { cache: "no-store" }
      )
      setReview(j.review ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "리뷰 조회 실패")
    } finally {
      setLoadingReview(false)
    }
  }, [])

  useEffect(() => {
    if (selectedId) loadReview(selectedId)
    else setReview(null)
  }, [selectedId, loadReview])

  /* AI 검수 실행 */
  const runAnalysis = async () => {
    if (!selectedId) return
    setAnalyzing(true)
    setError(null)
    try {
      const j = await safeFetchJson<{ ok: boolean; error?: string }>(
        "/api/reviews/run",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ draftId: selectedId, quality }),
        }
      )
      if (!j.ok) throw new Error(j.error ?? "검수 실패")
      await loadReview(selectedId)
    } catch (e) {
      setError(e instanceof Error ? e.message : "검수 실패")
    } finally {
      setAnalyzing(false)
    }
  }

  /* 검수 완료 — status approved · 이 페이지에 머무름 · 성공 피드백 · 다음 초안으로 */
  const handleComplete = async () => {
    if (!selectedId) return
    setSaving(true)
    setError(null)
    setCompletedAt(null)
    try {
      const j = await safeFetchJson<{ ok: boolean; error?: string }>(
        `/api/drafts/${selectedId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        }
      )
      if (!j.ok) throw new Error(j.error ?? "검수 완료 실패")
      setCompletedAt(
        new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      )
      /* drafts 리스트 재로딩 — approved 된 건 자동 사라짐, 다음 초안 자동 선택 */
      const completedId = selectedId
      setSelectedId(null)
      await loadDrafts()
      /* 5초 후 완료 배지 페이드아웃 */
      setTimeout(() => setCompletedAt(null), 5000)
      void completedId // 추후 로그 재참조 대비
    } catch (e) {
      setError(e instanceof Error ? e.message : "검수 완료 실패")
    } finally {
      setSaving(false)
    }
  }

  const selected = drafts.find((d) => d.id === selectedId)
  const categories = review?.items?.categories ?? []
  const sourceCheck = review?.items?.source_check
  const summary = review?.items?.summary
  const allItems = categories.flatMap((c) => c.items)
  const okCount = allItems.filter((i) => i.ok).length
  const totalCount = allItems.length

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 05 · REVIEW"
        title="검수"
        sub="AI 에이전트가 SEO·팩트·출처·톤을 콘텐츠 맞춤으로 분석합니다. '검수 완료'를 누르면 콘텐츠 관리에 쌓이고, 이 화면에서 다음 초안을 이어 검수할 수 있어요."
        actions={[
          { label: "← 콘텐츠 제작", href: "/blog/write" },
          {
            label: saving ? "완료 중…" : "✅ 검수 완료",
            icon: "check",
            onClick: handleComplete,
          },
          {
            label: "콘텐츠 관리 →",
            primary: true,
            href: "/blog/contents",
          },
        ]}
      />

      {error && (
        <div className="review-err">
          <span>⚠️</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {completedAt && (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 14px",
            background: "var(--success-bg)",
            border: "1px solid var(--success-border)",
            color: "var(--success-fg)",
            borderRadius: "var(--r-md)",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span>✅</span>
          <span style={{ flex: 1 }}>
            {completedAt} 검수 완료 — <b>콘텐츠 관리</b>에 저장됐어요. 다음 초안으로 이어가세요.
          </span>
          <Link
            href="/blog/contents"
            style={{ color: "var(--success-fg)", fontWeight: 600, textDecoration: "underline" }}
          >
            관리로 이동 →
          </Link>
        </div>
      )}

      <div className="review-grid">
        {/* LEFT: drafts 리스트 */}
        <div className="bcard">
          <div className="bcard__header">
            <div>
              <div className="bcard__title">검수 대상</div>
              <div className="bcard__sub">
                {loadingDrafts ? "로드 중…" : `${drafts.length}개 작성 중`}
              </div>
            </div>
          </div>
          <div style={{ maxHeight: 560, overflowY: "auto" }}>
            {drafts.length === 0 && !loadingDrafts && (
              <div
                style={{
                  padding: "32px 20px",
                  textAlign: "center",
                  fontSize: 12.5,
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                검수할 초안이 없어요.
                <br />
                <Link href="/blog/write" style={{ color: "var(--brand-600)", fontWeight: 600 }}>
                  콘텐츠 제작
                </Link>
                에서 본문부터 작성해주세요.
              </div>
            )}
            {drafts.map((d) => {
              const on = selectedId === d.id
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--border-subtle)",
                    cursor: "pointer",
                    background: on ? "var(--brand-50)" : "transparent",
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>
                    {d.title}
                  </div>
                  {d.primary_keyword && (
                    <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 3 }}>
                      🎯 {d.primary_keyword}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                    <span className="bchip" style={{ fontSize: 10 }}>{d.status}</span>
                    {d.progress_pct != null && (
                      <span className="bchip" style={{ fontSize: 10 }}>{d.progress_pct}%</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CENTER: 분석 결과 */}
        <div className="bcard">
          <div className="bcard__header">
            <div>
              <div className="bcard__title">AI 검수 분석</div>
              <div className="bcard__sub">
                {selected
                  ? review
                    ? `마지막 분석: ${new Date(review.created_at).toLocaleString("ko-KR")}`
                    : "아직 분석되지 않았어요"
                  : "왼쪽에서 초안을 선택하세요"}
              </div>
            </div>
            {selected && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}>
                <div
                  role="group"
                  aria-label="품질 모드"
                  style={{
                    display: "inline-flex",
                    background: "white",
                    border: "1px solid var(--border-default)",
                    borderRadius: 999,
                    padding: 2,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setQuality("flash")}
                    style={qualBtnStyle(quality === "flash")}
                  >💨 Flash</button>
                  <button
                    type="button"
                    onClick={() => setQuality("pro")}
                    style={qualBtnStyle(quality === "pro")}
                  >🧠 Pro</button>
                </div>
                <button
                  className="bbtn bbtn--primary bbtn--sm"
                  onClick={runAnalysis}
                  disabled={analyzing || !selected}
                >
                  {analyzing ? (
                    <><Spinner /> 분석 중…</>
                  ) : (
                    <><Icon name="sparkles" size={12} /> {review ? "재분석" : "AI 검수 실행"}</>
                  )}
                </button>
              </div>
            )}
          </div>

          {selected && (
            <div
              style={{
                padding: "12px 20px",
                background: "var(--bg-subtle)",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: 12.5,
              }}
            >
              <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>대상:</span>{" "}
              <b>{selected.title}</b>
            </div>
          )}

          {/* 결과 영역 */}
          <div style={{ padding: "16px 20px 20px" }}>
            {loadingReview && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                검수 정보 불러오는 중…
              </div>
            )}

            {!loadingReview && !review && selected && !analyzing && (
              <div
                style={{
                  padding: "48px 20px",
                  textAlign: "center",
                  fontSize: 13,
                  color: "var(--text-muted)",
                  lineHeight: 1.7,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.6 }}>🔍</div>
                아직 AI 검수를 실행하지 않았어요.
                <br />
                상단 <b style={{ color: "var(--brand-600)" }}>AI 검수 실행</b> 버튼으로 분석을 시작하세요.
                <br />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  콘텐츠 길이에 따라 20~60초 소요
                </span>
              </div>
            )}

            {analyzing && !review && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                <Spinner size={24} />
                <div style={{ marginTop: 12 }}>AI가 분석 중이에요 (SEO → 출처 → 톤 순)</div>
              </div>
            )}

            {review && (
              <>
                {summary && (
                  <div
                    style={{
                      padding: "12px 14px",
                      background: "var(--brand-50)",
                      border: "1px solid var(--brand-200)",
                      borderRadius: "var(--r-md)",
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--brand-700)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 4 }}>
                      종합 요약
                    </div>
                    <div style={{ fontSize: 13, lineHeight: 1.5 }}>{summary}</div>
                  </div>
                )}

                {/* 카테고리별 — 고정 3개 */}
                {FIXED_CATS.map((catName) => {
                  const c = categories.find((x) => x.cat === catName)
                  const meta = CAT_META[catName]
                  return (
                    <div key={catName} style={{ marginBottom: 18 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 10,
                          paddingBottom: 6,
                          borderBottom: "1px solid var(--border-subtle)",
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{meta.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>
                            {catName}
                            <span style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 500, marginLeft: 6 }}>
                              · {meta.desc}
                            </span>
                          </div>
                        </div>
                        {c && (
                          <span
                            className="text-mono"
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              padding: "2px 10px",
                              borderRadius: 999,
                              background: c.score >= 80 ? "#ecfdf5" : c.score >= 60 ? "#fffbeb" : "#fef2f2",
                              color: c.score >= 80 ? "#047857" : c.score >= 60 ? "#b45309" : "#b91c1c",
                            }}
                          >
                            {c.score}/100
                          </span>
                        )}
                      </div>
                      {c ? (
                        c.items.map((it, i) => <CheckItemRow key={i} item={it} />)
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", padding: 8 }}>
                          이 카테고리 항목 없음
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* 출처 체크 */}
                {sourceCheck && (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "14px 16px",
                      background: "#fff8ed",
                      border: "1px solid #fde68a",
                      borderRadius: "var(--r-md)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>🔗</span>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#92400e" }}>
                        출처·사실 검증
                      </div>
                      {sourceCheck.urls_found != null && (
                        <span
                          className="bchip"
                          style={{
                            marginLeft: "auto",
                            background: "white",
                            color: "#92400e",
                            fontSize: 10.5,
                            border: "1px solid #fde68a",
                          }}
                        >
                          URL {sourceCheck.urls_found}개 발견
                        </span>
                      )}
                    </div>
                    {sourceCheck.overall_note && (
                      <div style={{ fontSize: 12.5, color: "#92400e", marginBottom: 8, lineHeight: 1.5 }}>
                        {sourceCheck.overall_note}
                      </div>
                    )}
                    <SourceList title="의심 URL" items={sourceCheck.suspicious_urls} emoji="⚠️" />
                    <SourceList title="출처 없는 수치·주장" items={sourceCheck.missing_citations} emoji="📌" />
                    <SourceList title="시기·날짜 불일치" items={sourceCheck.date_inconsistencies} emoji="📅" />
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT: 스코어카드 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="bcard">
            <div className="bcard__body">
              <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>
                종합 스코어
              </div>
              {review ? (
                <>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                    <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-.03em", color: review.overall_score >= 80 ? "var(--success-fg)" : review.overall_score >= 60 ? "#b45309" : "var(--danger-fg)" }}>
                      {review.overall_score}
                    </div>
                    <div style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600 }}>/ 100</div>
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
                    체크 {okCount}/{totalCount} 통과
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-muted)", marginTop: 8, letterSpacing: "-.02em" }}>
                  —
                </div>
              )}
            </div>
          </div>

          {review && (
            <div className="bcard">
              <div className="bcard__header">
                <div className="bcard__title">카테고리 스코어</div>
              </div>
              <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                {FIXED_CATS.map((catName) => {
                  const c = categories.find((x) => x.cat === catName)
                  return (
                    <div key={catName} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 14 }}>{CAT_META[catName].emoji}</span>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>{catName}</div>
                      <span
                        className="text-mono"
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: c ? (c.score >= 80 ? "#047857" : c.score >= 60 ? "#b45309" : "#b91c1c") : "var(--text-muted)",
                        }}
                      >
                        {c ? c.score : "—"}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="bcard">
            <div className="bcard__body" style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              💡 상단 <b>✅ 검수 완료</b>를 누르면 이 화면에 머물며 다음 초안으로 이어갈 수 있어요.
              <br />
              완료된 콘텐츠는 <Link href="/blog/contents" style={{ color: "var(--brand-600)", fontWeight: 600 }}>콘텐츠 관리</Link>에 쌓입니다.
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .review-grid {
          display: grid;
          grid-template-columns: 260px 1fr 280px;
          gap: 14px;
          align-items: start;
        }
        @media (max-width: 1180px) {
          .review-grid {
            grid-template-columns: 1fr;
          }
        }
        .review-err {
          margin-bottom: 16px;
          padding: 10px 14px;
          background: var(--danger-bg);
          border: 1px solid var(--danger-border);
          color: var(--danger-fg);
          border-radius: var(--r-md);
          font-size: 13px;
          display: flex;
          gap: 8px;
          align-items: center;
        }
        @keyframes review-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

function qualBtnStyle(on: boolean): React.CSSProperties {
  return {
    fontSize: 10.5,
    fontWeight: 700,
    padding: "3px 9px",
    border: 0,
    background: on ? "var(--brand-600)" : "transparent",
    color: on ? "white" : "var(--text-secondary)",
    borderRadius: 999,
    cursor: "pointer",
  }
}

function CheckItemRow({ item }: { item: ReviewItem }) {
  const sev = item.severity ?? (item.ok ? "info" : "warning")
  const palette =
    sev === "error"
      ? { bg: "#fef2f2", border: "#fecaca", fg: "#b91c1c", iconBg: "#fee2e2" }
      : sev === "warning"
      ? { bg: "#fffbeb", border: "#fde68a", fg: "#b45309", iconBg: "#fef3c7" }
      : item.ok
      ? { bg: "#ecfdf5", border: "#a7f3d0", fg: "#047857", iconBg: "#d1fae5" }
      : { bg: "#f3f4f6", border: "#e5e7eb", fg: "#6b7280", iconBg: "#e5e7eb" }

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 12px",
        background: item.ok ? "var(--bg-subtle)" : palette.bg,
        border: `1px solid ${item.ok ? "var(--border-subtle)" : palette.border}`,
        borderRadius: "var(--r-md)",
        marginBottom: 6,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: palette.iconBg,
          color: palette.fg,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        <Icon
          name={item.ok ? "check" : "plus"}
          size={11}
          stroke={3}
          style={item.ok ? undefined : { transform: "rotate(45deg)" }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: item.ok ? "var(--text-primary)" : palette.fg }}>
          {item.label}
        </div>
        {item.detail && (
          <div style={{ fontSize: 11.5, color: "var(--text-secondary)", marginTop: 3, lineHeight: 1.5 }}>
            {item.detail}
          </div>
        )}
        {item.suggestion && !item.ok && (
          <div
            style={{
              fontSize: 11.5,
              color: palette.fg,
              marginTop: 4,
              lineHeight: 1.5,
              padding: "4px 8px",
              background: "white",
              border: `1px solid ${palette.border}`,
              borderRadius: 4,
            }}
          >
            💡 <b>제안:</b> {item.suggestion}
          </div>
        )}
      </div>
    </div>
  )
}

function SourceList({
  title,
  items,
  emoji,
}: {
  title: string
  items?: string[]
  emoji: string
}) {
  if (!items || items.length === 0) return null
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>
        {emoji} {title} ({items.length})
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11.5, color: "#78350f", lineHeight: 1.6 }}>
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  )
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTopColor: "currentColor",
        borderRadius: "50%",
        animation: "review-spin 0.8s linear infinite",
      }}
    />
  )
}
