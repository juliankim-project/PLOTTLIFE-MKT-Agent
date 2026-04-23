"use client"

import { Icon, PageHeader, Toggle } from "../_ui"

const CHANNELS = [
  { n: "플라트 오피셜 블로그", fmt: "롱폼 HTML", on: true, date: "2026.04.24 10:00", a: "blog@plottlife" },
  { n: "네이버 블로그", fmt: "에디터 변환", on: true, date: "2026.04.24 10:30", a: "naver-bot" },
  { n: "뉴스레터", fmt: "요약본 + CTA", on: true, date: "2026.04.25 08:00", a: "stibee" },
  { n: "Medium (영문)", fmt: "번역 영문", on: false, date: "—", a: "—" },
  { n: "Instagram 카드", fmt: "카드 뉴스 5컷", on: true, date: "2026.04.24 14:00", a: "ig-official" },
  { n: "X / Threads", fmt: "스레드 트윗", on: true, date: "2026.04.24 15:30", a: "x-official" },
]

export default function PublishPage() {
  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 06 · PUBLISH"
        title="발행"
        sub="오피셜 블로그·네이버·뉴스레터·소셜·Medium 영문으로 채널별 포맷을 변환해 예약·발행합니다."
        actions={[{ label: "지금 발행", primary: true, icon: "send" }]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 14 }}>
        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">채널 매트릭스</div>
          </div>
          <div style={{ padding: 18 }}>
            {CHANNELS.map((c, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 170px 110px 60px",
                  gap: 10,
                  alignItems: "center",
                  padding: "12px 0",
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{c.n}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>{c.a}</div>
                </div>
                <span className="bchip">{c.fmt}</span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  <Icon name="calendar" size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                  {c.date}
                </span>
                <span className={`bchip ${c.on ? "bchip--success" : ""}`}>
                  {c.on ? "예약됨" : "비활성"}
                </span>
                <Toggle defaultOn={c.on} />
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
