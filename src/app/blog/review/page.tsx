"use client"

import { useRouter } from "next/navigation"
import { Icon, PageHeader } from "../_ui"

const CHECKS = [
  {
    cat: "SEO",
    items: [
      { l: "제목에 주요 키워드 포함 (보증금 0원 / 단기임대)", ok: true },
      { l: "메타 디스크립션 130~160자", ok: true },
      { l: "H1 → H2 → H3 구조 정합", ok: true },
      { l: "이미지 alt 속성 전체 입력", ok: false, m: "2개 누락" },
      { l: "내부 링크 3개 이상 (매물 허브·가이드)", ok: true },
    ],
  },
  {
    cat: "팩트·서비스 정확성",
    items: [
      { l: "수치·통계 출처 명시 (매물 시세·검색량)", ok: true },
      { l: "플라트 서비스 설명 최신성 (2026 기준)", ok: true },
      { l: "ARC·거주숙소제공확인서 절차 정확성", ok: false, m: "법무부 고시 2025 버전" },
      { l: "외국인 비자 명칭·약어 정확 (D-2/D-4/E/F-1)", ok: true },
    ],
  },
  {
    cat: "톤 & 브랜드",
    items: [
      { l: "플라트 보이스 일관성 (친근·실용적)", ok: true },
      { l: "독자 기준 난이도 (외국인 유학생)", ok: true },
      { l: "금지어 / 민감 표현 필터 (차별적 표현)", ok: true },
      { l: "CTA 매물 링크 자연스러운 배치", ok: true },
    ],
  },
]

export default function ReviewPage() {
  const router = useRouter()
  const total = CHECKS.flatMap((c) => c.items)
  const pass = total.filter((i) => i.ok).length

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 05 · REVIEW"
        title="검수"
        sub="SEO·팩트·서비스 정확성(ARC·비자)·플라트 보이스를 체크리스트로 교차검증하고 승인 또는 반려합니다."
        actions={[
          { label: "승인 요청", icon: "check" },
          { label: "발행으로 →", primary: true, onClick: () => router.push("/blog/publish") },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 14 }}>
        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">체크리스트</div>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 120,
                  height: 6,
                  background: "var(--bg-muted)",
                  borderRadius: "var(--r-pill)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(pass / total.length) * 100}%`,
                    height: "100%",
                    background: "var(--accent-emerald)",
                  }}
                />
              </div>
              <span className="text-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                {pass}/{total.length}
              </span>
            </div>
          </div>
          <div style={{ padding: "8px 20px 20px" }}>
            {CHECKS.map((g) => (
              <div key={g.cat} style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                    marginBottom: 10,
                  }}
                >
                  {g.cat}
                </div>
                {g.items.map((it, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--r-md)",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: it.ok ? "var(--success-bg)" : "var(--danger-bg)",
                        color: it.ok ? "var(--success-fg)" : "var(--danger-fg)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Icon
                        name={it.ok ? "check" : "plus"}
                        size={12}
                        stroke={3}
                        style={it.ok ? undefined : { transform: "rotate(45deg)" }}
                      />
                    </div>
                    <div style={{ flex: 1, fontSize: 13 }}>{it.l}</div>
                    {"m" in it && it.m && <span className="bchip bchip--danger">{it.m}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="bcard">
            <div className="bcard__body">
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>종합 스코어</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.03em" }}>87</div>
                <div style={{ fontSize: 14, color: "var(--success-fg)", fontWeight: 600 }}>/ 100</div>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 8 }}>
                ARC 절차 버전 업데이트 후 승인 권장
              </div>
            </div>
          </div>

          <div className="bcard">
            <div className="bcard__header">
              <div className="bcard__title">승인 흐름</div>
            </div>
            <div style={{ padding: 14 }}>
              {[
                { u: "코피라이터", r: "초안 작성", d: "완료", color: "var(--success-fg)" },
                { u: "SEO Auditor", r: "SEO 검수", d: "완료", color: "var(--success-fg)" },
                { u: "Content Strategist", r: "최종 승인", d: "진행 중", color: "var(--brand-600)" },
              ].map((s, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      color: "white",
                      fontWeight: 700,
                      fontSize: 10,
                      background: s.color,
                    }}
                  >
                    {s.u[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.u}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.r}</div>
                  </div>
                  <span style={{ fontSize: 11, color: s.color, fontWeight: 600 }}>{s.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
