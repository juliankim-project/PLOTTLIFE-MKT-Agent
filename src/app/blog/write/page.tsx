"use client"

import { useRouter } from "next/navigation"
import { Icon, PageHeader } from "../_ui"

const QUEUE = [
  { id: "bc-1", t: "보증금 0원 단기임대 추천 TOP 10 — 서울 전 지역", prog: 74, s: "active" as const },
  { id: "bc-2", t: "외국인등록증(ARC) 3주 완성 가이드", prog: 48, s: "active" as const },
  { id: "bc-3", t: "서울 vs 부산 vs 제주 — 한달살기 어디로 갈까", prog: 18, s: "queue" as const },
]

export default function WritePage() {
  const router = useRouter()
  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 04 · WRITE"
        title="작성"
        sub="확정된 브리프 3건의 초안을 섹션별 생성·편집합니다. 플라트 보이스 가이드와 레퍼런스가 자동으로 연결됩니다."
        actions={[{ label: "검수로 →", primary: true, onClick: () => router.push("/blog/review") }]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 14 }}>
        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">작성 큐</div>
          </div>
          <div style={{ padding: 8 }}>
            {QUEUE.map((d, i) => (
              <div
                key={d.id}
                style={{
                  padding: "10px 10px",
                  borderRadius: "var(--r-md)",
                  background: i === 0 ? "var(--brand-50)" : "transparent",
                  border: i === 0 ? "1px solid var(--brand-200)" : "1px solid transparent",
                  marginBottom: 4,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6, lineHeight: 1.3 }}>{d.t}</div>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${d.prog}%` }} />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 4,
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  <span>{d.s === "active" ? "작성 중" : "대기"}</span>
                  <span className="text-mono">{d.prog}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bcard">
          <div className="bcard__header">
            <div>
              <div className="bcard__title">보증금 0원 단기임대 추천 TOP 10 — 서울 전 지역</div>
              <div className="bcard__sub">#Prepare · 예상 3,200자 · 섹션 6개</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              <span className="bchip bchip--success">
                <span className="bchip__dot" /> 자동 저장
              </span>
              <button className="bbtn bbtn--subtle bbtn--sm">
                <Icon name="sparkles" size={12} /> AI 확장
              </button>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px" }}>
            <div
              style={{
                padding: "20px 24px",
                borderRight: "1px solid var(--border-subtle)",
                minHeight: 520,
              }}
            >
              <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-.02em", margin: "0 0 8px" }}>
                보증금 0원 단기임대 추천 TOP 10 — 서울 전 지역
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 0 }}>
                2026.04 · 예상 읽기 시간 6분
              </p>
              <div style={{ height: 1, background: "var(--border-subtle)", margin: "16px 0" }} />

              <h3 style={{ fontSize: 15, margin: "18px 0 8px" }}>1. 왜 보증금 0원이 외국인에게 중요한가</h3>
              <p style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                외국인 유학생·노마드의 한국 단기 체류에서 <b>보증금은 가장 큰 현금 부담</b>입니다. 일반 임대는
                500~2,000만 원의 보증금이 요구되는 반면, 플라트라이프의 매물은 <b>보증금 0원 또는 월 10~30만 원
                수준</b>으로 유지되어 입국 직후 바로 입주가 가능합니다…
              </p>

              <div
                style={{
                  padding: 14,
                  background: "var(--brand-50)",
                  border: "1px dashed var(--brand-300)",
                  borderRadius: "var(--r-md)",
                  margin: "14px 0",
                  fontSize: 13,
                }}
              >
                <b style={{ color: "var(--brand-700)" }}>💡 AI 섹션 제안</b>
                <p style={{ margin: "4px 0 0", color: "var(--text-secondary)" }}>
                  여기에 &ldquo;실제 게스트 3명의 보증금 비교 사례&rdquo;를 추가하면 체류시간이 +24% 예상됩니다.
                </p>
              </div>

              <h3 style={{ fontSize: 15, margin: "18px 0 8px", color: "var(--text-muted)" }}>
                2. 지역별 매물 TOP 10{" "}
                <span style={{ fontSize: 11, background: "var(--bg-muted)", padding: "2px 6px", borderRadius: 4 }}>
                  초안 대기
                </span>
              </h3>
              <h3 style={{ fontSize: 15, margin: "18px 0 8px", color: "var(--text-muted)" }}>
                3. 예약부터 체크인까지 단계별 플로우{" "}
                <span style={{ fontSize: 11, background: "var(--bg-muted)", padding: "2px 6px", borderRadius: 4 }}>
                  초안 대기
                </span>
              </h3>
            </div>
            <div style={{ padding: "16px 18px", background: "var(--bg-subtle)" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: ".04em",
                  color: "var(--text-muted)",
                  marginBottom: 10,
                }}
              >
                사이드 패널
              </div>
              <Panel title="플라트 보이스">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {["친근·실용적", "외국인 독자 1순위", "매물 CTA 중심", "Service-first"].map((t) => (
                    <span key={t} className="bchip bchip--brand">
                      {t}
                    </span>
                  ))}
                </div>
              </Panel>
              <Panel title="SEO 스코어">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: "50%",
                      background: "conic-gradient(var(--accent-emerald) 288deg, var(--bg-muted) 0)",
                      display: "grid",
                      placeItems: "center",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 3,
                        background: "var(--bg-subtle)",
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                    >
                      80
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    메타 · 제목 · H2 구조 OK
                    <br />
                    이미지 alt 2건 누락
                  </div>
                </div>
              </Panel>
              <Panel title="참고 레퍼런스">
                {[
                  "플라트 FAQ — 보증금·계약",
                  "엔코스테이 — 외국인 체크리스트",
                  "법무부 외국인등록 안내",
                ].map((r) => (
                  <div
                    key={r}
                    style={{
                      fontSize: 12,
                      padding: "4px 0",
                      color: "var(--text-secondary)",
                      display: "flex",
                      gap: 6,
                      alignItems: "center",
                    }}
                  >
                    <Icon name="link" size={11} /> {r}
                  </div>
                ))}
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        marginBottom: 14,
        padding: 12,
        background: "white",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--r-md)",
      }}
    >
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  )
}
