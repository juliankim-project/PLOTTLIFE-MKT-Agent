"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Icon, PageHeader } from "../_ui"
import { CLUSTER_LABEL, INTENT_DEFS, type JourneyStage, type Intent } from "@/lib/ideation/compass"

function stageLabel(c: string | null | undefined): string {
  if (!c) return "—"
  return (CLUSTER_LABEL as Record<string, string>)[c] ?? c
}

function intentLabel(i: string | null | undefined): string | null {
  if (!i) return null
  const def = INTENT_DEFS[i as Intent]
  return def ? `${def.emoji} ${def.ko}` : i
}

interface ShortlistedIdea {
  id: string
  title: string
  cluster: string | null
  rationale: string | null
  volume: number | null
  fit_score: number | null
  signal: { kind?: string; detail?: string; intent?: string } | null
  related_keywords: string[] | null
  status: string
  created_at: string
}

interface OutlineSection {
  heading: string
  level: 2 | 3
  bullets?: string[]
  est_words?: number
}

interface TopicBrief {
  id: string
  idea_id: string
  title: string
  slug: string
  primary_keyword: string
  secondary_keywords: string[]
  target_kpi: "conversion" | "traffic" | "dwell_time"
  tone_guide: string | null
  outline: OutlineSection[]
  cta_hints: string[]
  brief: string | null
  status: string
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

const KPI_LABEL: Record<string, { icon: string; label: string; color: string }> = {
  conversion: { icon: "💰", label: "예약 전환", color: "#10B981" },
  traffic: { icon: "📈", label: "오가닉 트래픽", color: "#3B82F6" },
  dwell_time: { icon: "📖", label: "체류 / 브랜드", color: "#8B5CF6" },
}

export default function TopicsPage() {
  const router = useRouter()
  const [shortlist, setShortlist] = useState<ShortlistedIdea[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null)
  const [brief, setBrief] = useState<TopicBrief | null>(null)
  const [generating, setGenerating] = useState(false)
  const [approving, setApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /* 본문 형태 — auto 또는 3가지 강제 */
  const [forcedTemplate, setForcedTemplate] = useState<"auto" | "steps" | "compare" | "story">("auto")

  const loadShortlist = useCallback(async () => {
    setLoading(true)
    try {
      const j = await safeFetchJson<{ ok: boolean; ideas?: ShortlistedIdea[] }>(
        "/api/ideation/ideas?status=shortlisted&limit=50",
        { cache: "no-store" }
      )
      if (!j.ok) throw new Error("불러오기 실패")
      const list = (j.ideas ?? []).sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
      setShortlist(list)
      if (list.length > 0 && !selectedIdeaId) setSelectedIdeaId(list[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류")
    } finally {
      setLoading(false)
    }
  }, [selectedIdeaId])

  useEffect(() => {
    loadShortlist()
  }, [loadShortlist])

  const sortedShortlist = useMemo(() => shortlist, [shortlist])

  const generateBrief = async () => {
    if (!selectedIdeaId) return
    setGenerating(true)
    setError(null)
    setBrief(null)
    try {
      const j = await safeFetchJson<{ ok: boolean; result?: { topic: TopicBrief; reused: boolean }; error?: string }>(
        "/api/topics/brief",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ideaId: selectedIdeaId,
            forcedTemplate: forcedTemplate === "auto" ? undefined : forcedTemplate,
          }),
        }
      )
      if (!j.ok || !j.result) throw new Error(j.error ?? "브리프 생성 실패")
      setBrief(j.result.topic)
    } catch (e) {
      setError(e instanceof Error ? e.message : "브리프 생성 실패")
    } finally {
      setGenerating(false)
    }
  }

  const approveAndGoToWrite = async () => {
    if (!brief) return
    setApproving(true)
    try {
      // 상태 approved 로
      await fetch(`/api/topics/${brief.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      })
      router.push(`/blog/write/${brief.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "확정 실패")
      setApproving(false)
    }
  }

  const selectedIdea = sortedShortlist.find((i) => i.id === selectedIdeaId) ?? null

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 03 · BRIEF"
        title="브리프 작성"
        sub="아이데이션에서 선정된 주제 중 이번 라운드에 작성할 1개를 고르면, Content Strategist가 아웃라인·페르소나·KPI·CTA 포인트를 담은 상세 브리프를 만듭니다. 다음 단계(콘텐츠 제작)의 입력이 됩니다."
        actions={[
          { label: "← 아이데이션", href: "/blog/ideation" },
          { label: "콘텐츠 제작으로 →", primary: true, href: "/blog/write" },
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
          }}
        >
          ⚠️ <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ color: "var(--danger-fg)" }}>✕</button>
        </div>
      )}

      <div className="topics-grid">
        {/* LEFT: shortlist 후보 라디오 */}
        <div className="bcard">
          <div className="bcard__header">
            <div>
              <div className="bcard__title">Shortlisted 후보</div>
              <div className="bcard__sub">
                {loading ? "불러오는 중…" : `${sortedShortlist.length}개 · 점수순`}
              </div>
            </div>
            <button
              className="bbtn bbtn--ghost bbtn--sm"
              style={{ marginLeft: "auto" }}
              onClick={loadShortlist}
            >
              <Icon name="sort" size={12} /> 새로고침
            </button>
          </div>
          <div style={{ maxHeight: 640, overflowY: "auto" }}>
            {!loading && sortedShortlist.length === 0 && (
              <div style={{ padding: "40px 24px", textAlign: "center", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
                <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>📋</div>
                Shortlist 된 후보가 없어요.
                <br />
                먼저{" "}
                <a href="/blog/ideation" style={{ color: "var(--brand-600)", fontWeight: 600 }}>
                  아이데이션
                </a>
                에서 체크하고 퍼널로 넘겨주세요.
              </div>
            )}

            {sortedShortlist.map((i) => {
              const selected = selectedIdeaId === i.id
              const score = i.fit_score ?? 0
              return (
                <label
                  key={i.id}
                  style={{
                    display: "flex",
                    gap: 10,
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border-subtle)",
                    cursor: "pointer",
                    background: selected ? "var(--brand-50)" : "transparent",
                    alignItems: "flex-start",
                  }}
                >
                  <input
                    type="radio"
                    name="idea"
                    checked={selected}
                    onChange={() => {
                      setSelectedIdeaId(i.id)
                      setBrief(null)
                    }}
                    style={{ marginTop: 6 }}
                  />
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `conic-gradient(var(--brand-500) ${score * 3.6}deg, var(--bg-muted) 0)`,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 2,
                        background: "white",
                        borderRadius: 6,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {score}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, marginBottom: 4 }}>
                      {i.title}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 4 }}>
                      <span className="bchip">#{stageLabel(i.cluster)}</span>
                      {i.signal?.intent && (
                        <span className="bchip bchip--brand">{intentLabel(i.signal.intent)}</span>
                      )}
                      {i.volume && (
                        <span className="bchip bchip--info">
                          {i.volume >= 1000 ? `${(i.volume / 1000).toFixed(0)}K` : i.volume}
                        </span>
                      )}
                    </div>
                    {i.rationale && (
                      <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                        {i.rationale}
                      </div>
                    )}
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* CENTER: 선택 요약 + 브리프 생성 */}
        <div className="bcard">
          <div className="bcard__header">
            <div>
              <div className="bcard__title">브리프</div>
              <div className="bcard__sub">
                {brief ? "Content Strategist 가 작성한 상세 브리프" : "라디오로 1개 선택 후 생성"}
              </div>
            </div>
            {brief && (
              <span className="bchip bchip--success" style={{ marginLeft: "auto" }}>
                <span className="bchip__dot" /> 준비 완료
              </span>
            )}
          </div>

          <div style={{ padding: 20 }}>
            {/* 선택된 idea 요약 */}
            {selectedIdea && (
              <div
                style={{
                  padding: 14,
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--r-md)",
                  marginBottom: 16,
                }}
              >
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6 }}>
                  선택된 아이디어
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{selectedIdea.title}</div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                  <span className="bchip">#{stageLabel(selectedIdea.cluster)}</span>
                  {selectedIdea.signal?.intent && (
                    <span className="bchip bchip--brand">{intentLabel(selectedIdea.signal.intent)}</span>
                  )}
                  {selectedIdea.fit_score != null && (
                    <span className="bchip bchip--brand">fit {selectedIdea.fit_score}</span>
                  )}
                </div>
              </div>
            )}

            {/* 본문 형태 선택 */}
            {!brief && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>
                  본문 형태
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                  {([
                    { value: "auto", emoji: "🤖", label: "자동", desc: "주제 성격에 맞춰 AI 가 선택" },
                    { value: "steps", emoji: "📖", label: "가이드형", desc: "절차·체크리스트 (입주/비자/계약)" },
                    { value: "compare", emoji: "⚖️", label: "비교/추천", desc: "선택지 비교 (동네·매물·옵션)" },
                    { value: "story", emoji: "💬", label: "스토리/Q&A", desc: "후기·생활 팁·FAQ" },
                  ] as const).map((opt) => {
                    const on = forcedTemplate === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setForcedTemplate(opt.value)}
                        style={{
                          padding: "10px 12px",
                          textAlign: "left",
                          border: `1.5px solid ${on ? "var(--brand-500)" : "var(--border-default)"}`,
                          background: on ? "var(--brand-50, #eef2ff)" : "white",
                          borderRadius: 8,
                          cursor: "pointer",
                          transition: "all 0.12s",
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 700, color: on ? "var(--brand-800, #3730a3)" : "var(--text-primary)" }}>
                          {opt.emoji} {opt.label}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.4 }}>
                          {opt.desc}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 브리프 생성 버튼 */}
            {!brief && (
              <button
                className="bbtn bbtn--primary bbtn--lg"
                style={{ width: "100%" }}
                onClick={generateBrief}
                disabled={!selectedIdeaId || generating}
              >
                {generating ? (
                  <>
                    <Spinner /> <span style={{ marginLeft: 6 }}>Content Strategist 가 브리프 작성 중…</span>
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" size={15} /> 브리프 생성
                  </>
                )}
              </button>
            )}

            {/* 브리프 표시 */}
            {brief && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* 제목·슬러그·KPI */}
                <div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, marginBottom: 6 }}>
                    확정 제목
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.35, letterSpacing: "-.01em" }}>
                    {brief.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>/{brief.slug}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  <BriefField
                    label="타겟 KPI"
                    value={
                      <span
                        className="bchip"
                        style={{
                          background: (KPI_LABEL[brief.target_kpi]?.color ?? "#999") + "22",
                          color: KPI_LABEL[brief.target_kpi]?.color,
                        }}
                      >
                        {KPI_LABEL[brief.target_kpi]?.icon} {KPI_LABEL[brief.target_kpi]?.label}
                      </span>
                    }
                  />
                  <BriefField label="예상 길이" value={brief.brief ?? "—"} />
                </div>

                {/* 키워드 */}
                <BriefField
                  label="Primary keyword"
                  value={
                    <span className="bchip bchip--brand" style={{ fontSize: 12 }}>
                      {brief.primary_keyword}
                    </span>
                  }
                />
                {brief.secondary_keywords.length > 0 && (
                  <BriefField
                    label="Secondary keywords"
                    value={
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {brief.secondary_keywords.map((k) => (
                          <span key={k} className="bchip" style={{ fontSize: 11 }}>
                            {k}
                          </span>
                        ))}
                      </div>
                    }
                  />
                )}

                {/* 톤 가이드 */}
                {brief.tone_guide && (
                  <BriefField label="톤 가이드" value={<span style={{ lineHeight: 1.5 }}>{brief.tone_guide}</span>} />
                )}

                {/* 아웃라인 */}
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-muted)",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: ".04em",
                      marginBottom: 8,
                    }}
                  >
                    아웃라인 ({brief.outline.length}개 섹션)
                  </div>
                  <div
                    style={{
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--r-md)",
                      background: "var(--bg-subtle)",
                    }}
                  >
                    {brief.outline.map((o, i) => (
                      <div
                        key={i}
                        style={{
                          padding: "10px 14px",
                          borderBottom:
                            i < brief.outline.length - 1 ? "1px solid var(--border-subtle)" : "none",
                          paddingLeft: o.level === 3 ? 32 : 14,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            className="text-mono"
                            style={{
                              fontSize: 10,
                              color: "var(--brand-600)",
                              fontWeight: 700,
                              background: "var(--brand-50)",
                              padding: "1px 5px",
                              borderRadius: 3,
                            }}
                          >
                            H{o.level}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{o.heading}</span>
                          {o.est_words && (
                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>~{o.est_words}자</span>
                          )}
                        </div>
                        {o.bullets && o.bullets.length > 0 && (
                          <ul
                            style={{
                              margin: "6px 0 0",
                              paddingLeft: 16,
                              fontSize: 11.5,
                              color: "var(--text-secondary)",
                              lineHeight: 1.55,
                            }}
                          >
                            {o.bullets.map((b, j) => (
                              <li key={j}>{b}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA */}
                {brief.cta_hints.length > 0 && (
                  <BriefField
                    label="마무리 CTA"
                    value={
                      <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, lineHeight: 1.5 }}>
                        {brief.cta_hints.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    }
                  />
                )}
              </div>
            )}
          </div>

          {brief && (
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--border-subtle)",
                display: "flex",
                gap: 8,
              }}
            >
              <button
                className="bbtn bbtn--subtle"
                style={{ flex: 1 }}
                onClick={() => {
                  setBrief(null)
                }}
                disabled={approving}
              >
                다시 만들기
              </button>
              <button
                className="bbtn bbtn--primary"
                style={{ flex: 2 }}
                onClick={approveAndGoToWrite}
                disabled={approving}
              >
                {approving ? (
                  <>
                    <Spinner /> <span style={{ marginLeft: 6 }}>확정 중…</span>
                  </>
                ) : (
                  <>
                    확정하고 작성 단계로 <Icon name="chevron" size={12} />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .blog-shell .topics-grid {
          display: grid;
          grid-template-columns: 380px 1fr;
          gap: 14px;
          align-items: start;
        }
        @media (max-width: 1180px) {
          .blog-shell .topics-grid { grid-template-columns: 1fr; }
        }
        @keyframes topics-spin { to { transform: rotate(360deg); } }
        .blog-shell .topics-spinner {
          display: inline-block;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: topics-spin 0.8s linear infinite;
          width: 14px; height: 14px;
        }
      `}</style>
    </div>
  )
}

function BriefField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: ".04em",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 13 }}>{value}</div>
    </div>
  )
}

function Spinner() {
  return <span className="topics-spinner" />
}
