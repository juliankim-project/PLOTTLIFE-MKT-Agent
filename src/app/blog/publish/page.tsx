"use client"

import { PageHeader, Toggle } from "../_ui"
import { CHANNELS } from "../_lib/channels"

export default function PublishPage() {
  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 07 · PUBLISH"
        title="발행관리"
        sub="오피셜 블로그·네이버·뉴스레터·소셜·Medium 영문 채널별 On/Off 와 발행 타이밍을 관리합니다. 개별 콘텐츠의 발행 세팅은 콘텐츠 관리에서 하세요."
        actions={[
          { label: "← 콘텐츠 관리", href: "/blog/contents" },
          { label: "성과분석으로 →", primary: true, href: "/blog/analyze" },
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 14 }}>
        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">채널 매트릭스</div>
          </div>
          <div style={{ padding: 18 }}>
            {CHANNELS.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 130px 110px 60px",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ fontSize: 22, lineHeight: 1, textAlign: "center" }}>{c.emoji}</div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
                    {c.desc}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 2 }}>
                    계정: {c.account}
                  </div>
                </div>
                <span className="bchip">{c.format}</span>
                <span className={`bchip ${c.defaultEnabled ? "bchip--success" : ""}`}>
                  {c.defaultEnabled ? "활성" : "비활성"}
                </span>
                <Toggle defaultOn={c.defaultEnabled} />
              </div>
            ))}
          </div>
        </div>

        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">발행 미리보기</div>
          </div>
          <div style={{ padding: 14 }}>
            <div
              style={{
                border: "1px solid var(--border-default)",
                borderRadius: "var(--r-md)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: 120,
                  background: "linear-gradient(135deg, var(--brand-500), var(--accent-violet))",
                  display: "grid",
                  placeItems: "center",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                대표 이미지 (1200×630)
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.35, marginBottom: 6 }}>
                  보증금 0원 단기임대 추천 TOP 10 — 서울 전 지역
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  plottlife.com/blog · 2026.04.24 · 읽기 6분
                </div>
              </div>
            </div>
            <div
              style={{
                marginTop: 14,
                padding: 12,
                background: "var(--bg-subtle)",
                borderRadius: "var(--r-md)",
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              <b style={{ color: "var(--text-primary)" }}>메타 데이터</b>
              <br />
              title · og:image · canonical · schema.org Article · hreflang (ko/en)
              <br />
              <span style={{ color: "var(--success-fg)" }}>✓ 모든 메타 태그 자동 생성됨</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
