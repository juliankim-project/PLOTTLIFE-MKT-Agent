"use client"

import { useRouter } from "next/navigation"
import { Icon, PageHeader } from "../_ui"

const POSTS = [
  { t: "보증금 0원 단기임대 추천 TOP 10", pv: 24300, uv: 18200, dwell: "6:42", conv: 4.2, rank: 3 },
  { t: "외국인등록증(ARC) 3주 완성 가이드", pv: 18700, uv: 14100, dwell: "5:18", conv: 6.8, rank: 2 },
  { t: "성수동 단기임대 완벽 가이드 — 노마드 핫플", pv: 31200, uv: 22800, dwell: "7:51", conv: 2.1, rank: 1 },
]

export default function AnalyzePage() {
  const router = useRouter()
  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 08 · ANALYZE"
        title="성과분석"
        sub="트래픽·예약 전환·SERP 랭킹을 학습해 다음 여정(리서치)의 인풋으로 회수합니다."
        actions={[
          { label: "← 발행관리", onClick: () => router.push("/blog/publish") },
          { label: "리서치에 피드백", primary: true, icon: "sparkles" },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 18 }}>
        <div className="bkpi">
          <div className="bkpi__label">이번 달 PV</div>
          <div className="bkpi__value">182K</div>
          <div className="bkpi__delta">+28% vs 전월</div>
        </div>
        <div className="bkpi">
          <div className="bkpi__label">UV</div>
          <div className="bkpi__value">94.2K</div>
          <div className="bkpi__delta">+19%</div>
        </div>
        <div className="bkpi">
          <div className="bkpi__label">평균 체류</div>
          <div className="bkpi__value">6:24</div>
          <div className="bkpi__delta">+42초</div>
        </div>
        <div className="bkpi">
          <div className="bkpi__label">예약 전환율</div>
          <div className="bkpi__value">4.8%</div>
          <div className="bkpi__delta">+0.9%p</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">일별 트래픽</div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
              {["7일", "30일", "90일"].map((p, i) => (
                <button key={p} className={`bbtn ${i === 1 ? "bbtn--subtle" : "bbtn--ghost"} bbtn--sm`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: "18px 22px" }}>
            <svg viewBox="0 0 600 200" style={{ width: "100%", height: 200 }}>
              <defs>
                <linearGradient id="trafGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--brand-500)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--brand-500)" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3, 4].map((i) => (
                <line key={i} x1="0" x2="600" y1={i * 40 + 20} y2={i * 40 + 20} stroke="var(--border-subtle)" />
              ))}
              <path
                d="M0 140 C50 120, 100 130, 150 100 S 250 80, 300 90 S 400 60, 450 70 S 550 40, 600 50 L600 200 L0 200 Z"
                fill="url(#trafGrad)"
              />
              <path
                d="M0 140 C50 120, 100 130, 150 100 S 250 80, 300 90 S 400 60, 450 70 S 550 40, 600 50"
                fill="none"
                stroke="var(--brand-600)"
                strokeWidth="2.5"
              />
              {[
                [50, 120],
                [150, 100],
                [300, 90],
                [450, 70],
                [600, 50],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="4" fill="white" stroke="var(--brand-600)" strokeWidth="2" />
              ))}
            </svg>
          </div>
        </div>

        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">Top 포스트</div>
          </div>
          <div>
            {POSTS.map((p, i) => (
              <div key={i} style={{ padding: "12px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 6 }}>
                  <span
                    className="text-mono"
                    style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}
                  >
                    #{i + 1}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, flex: 1 }}>{p.t}</span>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 11.5, color: "var(--text-muted)" }}>
                  <span>
                    <Icon name="eye" size={10} style={{ verticalAlign: -1, marginRight: 2 }} />
                    {(p.pv / 1000).toFixed(1)}K
                  </span>
                  <span>
                    <Icon name="clock" size={10} style={{ verticalAlign: -1, marginRight: 2 }} />
                    {p.dwell}
                  </span>
                  <span>
                    전환 <b style={{ color: "var(--success-fg)" }}>{p.conv}%</b>
                  </span>
                  <span style={{ marginLeft: "auto" }}>
                    SERP <b>#{p.rank}</b>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bcard" style={{ marginTop: 14 }}>
        <div className="bcard__header">
          <div className="bcard__title">학습 피드백 · 리서치로 회수</div>
        </div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            {
              k: "고성과 패턴",
              v: "\"보증금 0원\" · \"완벽 가이드\" 형식이 평균 +34% 체류시간, +2.1%p 예약 전환",
              c: "var(--accent-emerald)",
            },
            {
              k: "저성과 패턴",
              v: "비자 정책 변경·시사성 콘텐츠는 발행 14일 후 PV 62% 감소",
              c: "var(--accent-amber)",
            },
            {
              k: "새 키워드 후보",
              v: "\"기후동행카드 외국인\" +180%, \"한달살기 반려동물\" +72% 급상승",
              c: "var(--brand-500)",
            },
          ].map((f, i) => (
            <div
              key={i}
              style={{
                padding: 14,
                border: `1px solid var(--border-default)`,
                borderRadius: "var(--r-md)",
                borderLeft: `3px solid ${f.c}`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: f.c,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                }}
              >
                {f.k}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
                {f.v}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
