"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Icon, PageHeader, MiniStat } from "../_ui"

interface Candidate {
  id: number
  t: string
  cluster: string
  vol: number
  comp: number
  seasonality: number
  persona: number
  brand: number
}

const CANDIDATES: Candidate[] = [
  { id: 1,  t: "보증금 0원 단기임대 추천 TOP 10 — 서울 전 지역", cluster: "Prepare",  vol: 34200, comp: 28, seasonality: 62, persona: 94, brand: 96 },
  { id: 2,  t: "외국인등록증(ARC) 3주 완성 가이드",              cluster: "Settle",   vol: 18200, comp: 18, seasonality: 48, persona: 92, brand: 88 },
  { id: 3,  t: "서울 vs 부산 vs 제주 — 한달살기 어디로 갈까",       cluster: "Consider", vol: 67100, comp: 58, seasonality: 84, persona: 78, brand: 72 },
  { id: 4,  t: "성수동 단기임대 완벽 가이드 — 노마드 핫플 2026",    cluster: "Explore",  vol: 12400, comp: 32, seasonality: 70, persona: 88, brand: 82 },
  { id: 5,  t: "기후동행카드 외국인용 — 티머니 완전 정복",         cluster: "Settle",   vol:  8900, comp: 14, seasonality: 52, persona: 86, brand: 64 },
  { id: 6,  t: "이사 과도기 3주~2개월 단기임대 — 짐 보관·계약 팁", cluster: "Change",   vol:  9800, comp: 22, seasonality: 58, persona: 72, brand: 84 },
  { id: 7,  t: "외국인 인터넷은행 3사 비교 — 케이뱅크·토스·우리WON", cluster: "Settle",  vol: 14200, comp: 34, seasonality: 45, persona: 88, brand: 62 },
  { id: 8,  t: "한국 노마드 월 생활비 — 서울·부산·제주 실제 후기",   cluster: "Consider", vol: 21500, comp: 44, seasonality: 60, persona: 80, brand: 70 },
  { id: 9,  t: "연세대·이대 유학생 추천 방 — 신촌 시세 비교",        cluster: "Explore",  vol: 11300, comp: 38, seasonality: 74, persona: 90, brand: 92 },
  { id: 10, t: "건국대 외국인 유학생 방 추천 — 화양동 핫스팟",       cluster: "Explore",  vol:  7800, comp: 24, seasonality: 70, persona: 92, brand: 94 },
  { id: 11, t: "D-2 유학 비자 완벽 가이드 — 신청부터 입국까지",      cluster: "Prepare",  vol: 15200, comp: 48, seasonality: 88, persona: 82, brand: 52 },
  { id: 12, t: "제주 한달살기 — 봄 시즌 워케이션 매물 가이드",        cluster: "Explore",  vol: 22700, comp: 52, seasonality: 95, persona: 76, brand: 86 },
]

type Weights = {
  vol: number
  comp: number
  seasonality: number
  persona: number
  brand: number
}

type StageKey = "pool" | "10" | "5" | "3"

export default function TopicFunnelPage() {
  const router = useRouter()
  const [weights, setWeights] = useState<Weights>({ vol: 22, comp: 18, seasonality: 15, persona: 22, brand: 23 })
  const [stage, setStage] = useState<StageKey>("pool")
  const [clusters, setClusters] = useState<Set<string>>(new Set())

  const scored = useMemo(() => {
    const wSum = Object.values(weights).reduce((a, b) => a + b, 0) || 1
    return CANDIDATES.map((c) => {
      const score =
        (weights.vol * (Math.log10(c.vol + 1) / 5) * 100 +
          weights.comp * (100 - c.comp) +
          weights.seasonality * c.seasonality +
          weights.persona * c.persona +
          weights.brand * c.brand) /
        wSum
      return { ...c, score: Math.round(score) }
    }).sort((a, b) => b.score - a.score)
  }, [weights])

  const filtered = useMemo(
    () => (clusters.size === 0 ? scored : scored.filter((s) => clusters.has(s.cluster))),
    [scored, clusters]
  )

  const currentLimit = stage === "pool" ? filtered.length : parseInt(stage, 10)
  const visible = filtered.slice(0, currentLimit)

  const toggleCluster = (c: string) => {
    const n = new Set(clusters)
    if (n.has(c)) n.delete(c)
    else n.add(c)
    setClusters(n)
  }
  const setWeight = (k: keyof Weights, v: string) =>
    setWeights((w) => ({ ...w, [k]: parseInt(v, 10) }))

  const allClusters = [...new Set(CANDIDATES.map((c) => c.cluster))]

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 03 · TOPIC SELECTION"
        title="주제선정 퍼널"
        sub="스코어링으로 12개 후보를 10→5→3개로 압축합니다. 좌측의 가중치를 조정하면 순위가 실시간으로 바뀝니다. 브랜드 적합도는 플라트 매물 매칭도입니다."
        actions={[{ label: "작성 단계로 →", primary: true, onClick: () => router.push("/blog/write") }]}
      />

      <div className="funnel-grid">
        {/* LEFT: Weights & filters */}
        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">스코어링 가중치</div>
            <span className="bchip bchip--brand" style={{ marginLeft: "auto" }}>실시간</span>
          </div>
          <div style={{ padding: 18 }}>
            {(
              [
                { k: "vol", label: "검색량", icon: "trend" as const, color: "var(--brand-500)" },
                { k: "comp", label: "경쟁도 (역)", icon: "filter" as const, color: "var(--accent-emerald)" },
                { k: "seasonality", label: "계절성·타이밍", icon: "calendar" as const, color: "var(--accent-amber)" },
                { k: "persona", label: "페르소나 매칭", icon: "users" as const, color: "var(--accent-cyan)" },
                { k: "brand", label: "플라트 매물 매칭", icon: "target" as const, color: "var(--accent-violet)" },
              ] as const
            ).map((s) => (
              <div key={s.k} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: `${s.color}22`,
                      color: s.color,
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Icon name={s.icon} size={12} />
                  </div>
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{s.label}</span>
                  <span
                    className="text-mono"
                    style={{ marginLeft: "auto", fontSize: 12, fontWeight: 700, color: s.color }}
                  >
                    {weights[s.k]}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights[s.k]}
                  onChange={(e) => setWeight(s.k, e.target.value)}
                  style={{ width: "100%", accentColor: s.color }}
                />
              </div>
            ))}
            <button
              className="bbtn bbtn--subtle bbtn--sm"
              style={{ width: "100%", marginTop: 4 }}
              onClick={() => setWeights({ vol: 22, comp: 18, seasonality: 15, persona: 22, brand: 23 })}
            >
              기본값으로 초기화
            </button>
          </div>

          <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border-subtle)" }}>
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
              여정 클러스터 필터
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {allClusters.map((c) => {
                const on = clusters.has(c)
                return (
                  <button
                    key={c}
                    onClick={() => toggleCluster(c)}
                    className={`bchip ${on ? "bchip--brand" : ""}`}
                    style={{
                      cursor: "pointer",
                      border: on ? "1px solid var(--brand-400)" : undefined,
                    }}
                  >
                    #{c}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* CENTER: Funnel */}
        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">압축 퍼널</div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              {(
                [
                  { k: "pool" as const, l: `Pool ${scored.length}` },
                  { k: "10" as const, l: "Top 10" },
                  { k: "5" as const, l: "Top 5" },
                  { k: "3" as const, l: "Final 3" },
                ] as const
              ).map((b) => (
                <button
                  key={b.k}
                  onClick={() => setStage(b.k)}
                  className={`bbtn ${stage === b.k ? "bbtn--primary" : "bbtn--ghost"} bbtn--sm`}
                >
                  {b.l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ padding: "20px 22px 8px" }}>
            <svg viewBox="0 0 600 200" style={{ width: "100%", height: 150 }}>
              <defs>
                <linearGradient id="funnelGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-300)" />
                  <stop offset="100%" stopColor="var(--accent-violet)" />
                </linearGradient>
              </defs>
              <path d="M20 20 L580 20 L420 180 L180 180 Z" fill="url(#funnelGrad)" opacity="0.12" />
              <path
                d="M20 20 L580 20 L420 180 L180 180 Z"
                fill="none"
                stroke="var(--brand-400)"
                strokeWidth="1.5"
              />
              {[
                { y: 60, label: "Top 10", count: Math.min(10, scored.length), left: 82, right: 518 },
                { y: 110, label: "Top 5", count: 5, left: 145, right: 455 },
                { y: 160, label: "Top 3", count: 3, left: 208, right: 392 },
              ].map((l) => (
                <g key={l.label}>
                  <line
                    x1={l.left}
                    y1={l.y}
                    x2={l.right}
                    y2={l.y}
                    stroke="var(--brand-500)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x="300"
                    y={l.y - 6}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--brand-700)"
                    fontWeight="600"
                  >
                    {l.label} · {l.count}건
                  </text>
                </g>
              ))}
              <text x="300" y="14" textAnchor="middle" fontSize="10.5" fill="var(--text-muted)" fontWeight="600">
                후보 Pool · {scored.length}건
              </text>
              <text
                x="300"
                y="196"
                textAnchor="middle"
                fontSize="10.5"
                fill="var(--text-muted)"
                fontWeight="600"
              >
                작성 큐로 →
              </text>
            </svg>
          </div>

          <div style={{ padding: "8px 18px 16px", maxHeight: 420, overflowY: "auto" }}>
            {visible.map((c, idx) => {
              const rank = idx + 1
              const advanced = rank <= 3 ? "final" : rank <= 5 ? "top5" : rank <= 10 ? "top10" : null
              return (
                <div key={c.id} className="topic-row">
                  <div className="topic-row__rank">
                    <span className="text-mono" style={{ fontWeight: 700 }}>#{rank}</span>
                    {advanced && (
                      <span className={`topic-row__badge topic-row__badge--${advanced}`}>
                        {advanced === "final" ? "FINAL" : advanced === "top5" ? "TOP 5" : "TOP 10"}
                      </span>
                    )}
                  </div>
                  <div className="topic-row__body">
                    <div className="topic-row__title">{c.t}</div>
                    <div className="topic-row__sub">
                      <span>#{c.cluster}</span>
                      <span>· {(c.vol / 1000).toFixed(1)}K/월</span>
                      <span>· 경쟁도 {c.comp}</span>
                      <span>· 플라트 매칭 {c.brand}</span>
                    </div>
                  </div>
                  <div className="topic-row__score">
                    <div
                      className="topic-row__score-ring"
                      style={{
                        background: `conic-gradient(
                          ${
                            c.score >= 80
                              ? "var(--accent-emerald)"
                              : c.score >= 65
                              ? "var(--brand-500)"
                              : "var(--accent-amber)"
                          } ${c.score * 3.6}deg,
                          var(--bg-muted) 0)`,
                      }}
                    >
                      <div className="topic-row__score-inner">{c.score}</div>
                    </div>
                  </div>
                </div>
              )
            })}
            {visible.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                선택된 클러스터에 해당하는 후보가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Final 3 brief */}
        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">최종 선정 · 브리프</div>
            <span className="bchip bchip--success" style={{ marginLeft: "auto" }}>3건 확정</span>
          </div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {scored.slice(0, 3).map((c, i) => (
              <div
                key={c.id}
                style={{
                  padding: 14,
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-md)",
                  background: "linear-gradient(180deg, var(--brand-50), white)",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: "var(--brand-600)",
                      color: "white",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35 }}>{c.t}</div>
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 6,
                    marginBottom: 10,
                  }}
                >
                  <MiniStat label="스코어" value={c.score} accent />
                  <MiniStat label="검색량" value={`${(c.vol / 1000).toFixed(0)}K`} />
                  <MiniStat label="경쟁도" value={c.comp} />
                </div>
                <div style={{ display: "flex", gap: 4, marginBottom: 10, flexWrap: "wrap" }}>
                  <span className="bchip">#{c.cluster}</span>
                  <span className="bchip bchip--info">롱폼 가이드</span>
                </div>
                <button className="bbtn bbtn--subtle bbtn--sm" style={{ width: "100%" }}>
                  브리프 자동 생성 <Icon name="sparkles" size={11} />
                </button>
              </div>
            ))}
            <button
              className="bbtn bbtn--primary"
              style={{ marginTop: 4 }}
              onClick={() => router.push("/blog/write")}
            >
              3건 모두 작성 단계로 <Icon name="chevron" size={12} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .blog-shell .funnel-grid {
          display: grid;
          grid-template-columns: 260px 1fr 360px;
          gap: 14px;
          align-items: start;
        }
        @media (max-width: 1180px) {
          .blog-shell .funnel-grid { grid-template-columns: 1fr; }
        }
        .blog-shell .topic-row {
          display: flex; align-items: center; gap: 12px;
          padding: 10px 4px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .blog-shell .topic-row:last-child { border-bottom: 0; }
        .blog-shell .topic-row__rank { width: 64px; display: flex; flex-direction: column; gap: 2px; align-items: flex-start; }
        .blog-shell .topic-row__badge {
          font-size: 9px; font-weight: 800; letter-spacing: .06em;
          padding: 1px 5px; border-radius: 3px;
        }
        .blog-shell .topic-row__badge--final { background: var(--accent-emerald); color: white; }
        .blog-shell .topic-row__badge--top5  { background: var(--brand-600); color: white; }
        .blog-shell .topic-row__badge--top10 { background: var(--bg-muted); color: var(--text-secondary); }
        .blog-shell .topic-row__body { flex: 1; min-width: 0; }
        .blog-shell .topic-row__title { font-size: 13px; font-weight: 600; line-height: 1.35; margin-bottom: 3px; }
        .blog-shell .topic-row__sub { font-size: 11.5px; color: var(--text-muted); display: flex; gap: 4px; flex-wrap: wrap; }
        .blog-shell .topic-row__score-ring {
          width: 38px; height: 38px; border-radius: 50%;
          display: grid; place-items: center; position: relative;
        }
        .blog-shell .topic-row__score-inner {
          position: absolute; inset: 3px; background: white;
          border-radius: 50%; display: grid; place-items: center;
          font-size: 12px; font-weight: 700; font-variant-numeric: tabular-nums;
        }
      `}</style>
    </div>
  )
}
