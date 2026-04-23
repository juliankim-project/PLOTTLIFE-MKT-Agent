"use client"

import { useState } from "react"
import { Icon, PageHeader } from "../_ui"

type Tab = "trends" | "competitor" | "product"

const TRENDS = [
  { kw: "보증금 없는 단기임대", vol: 34200, growth: 142, comp: "낮음", persona: "외국인 유학생" },
  { kw: "서울 한달살기", vol: 67100, growth: 52, comp: "중", persona: "한달살기 여행자" },
  { kw: "외국인등록증(ARC) 발급", vol: 18200, growth: 28, comp: "낮음", persona: "외국인 유학생" },
  { kw: "성수동 한달살기", vol: 12400, growth: 27, comp: "낮음", persona: "디지털 노마드" },
  { kw: "기후동행카드 외국인", vol: 8900, growth: 180, comp: "낮음", persona: "외국인 유학생" },
  { kw: "이사 과도기 단기임대", vol: 9800, growth: 64, comp: "낮음", persona: "내국인 이사 과도기" },
]

const COMPETITORS = [
  { name: "엔코스테이 (N)", posts: 142, avgRead: "5:28", topics: ["한달살기", "노마드", "체험"] },
  { name: "미스터멘션", posts: 96, avgRead: "4:10", topics: ["장기임대", "지역", "예약 팁"] },
  { name: "Airbnb 뉴스룸 KR", posts: 58, avgRead: "3:42", topics: ["호스팅", "트렌드", "지역"] },
  { name: "직방 블로그", posts: 238, avgRead: "6:15", topics: ["부동산", "시세", "이사"] },
]

export default function ResearchPage() {
  const [tab, setTab] = useState<Tab>("trends")

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 01 · RESEARCH"
        title="리서치"
        sub="타겟 독자 검색·경쟁사·플라트 자사 데이터를 수집해 다음 단계의 인풋으로 정리합니다."
        actions={[
          { label: "새 소스 연결", primary: true, icon: "plus" },
          { label: "CSV 내보내기", icon: "upload" },
        ]}
      />

      <div className="btabs">
        <button className={`btab${tab === "trends" ? " btab--active" : ""}`} onClick={() => setTab("trends")}>
          검색 트렌드
        </button>
        <button className={`btab${tab === "competitor" ? " btab--active" : ""}`} onClick={() => setTab("competitor")}>
          경쟁사 블로그
        </button>
        <button className={`btab${tab === "product" ? " btab--active" : ""}`} onClick={() => setTab("product")}>
          플라트 자사 데이터
        </button>
      </div>

      {tab === "trends" && (
        <div className="bcard">
          <div className="bcard__header">
            <div>
              <div className="bcard__title">네이버 · 구글 트렌드 (지난 30일)</div>
              <div className="bcard__sub">검색량 기준 TOP 6 · 자동 업데이트 매일 오전 9시</div>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <span className="bchip bchip--brand">실시간 동기화</span>
              <button className="bbtn bbtn--subtle bbtn--sm">
                <Icon name="filter" size={12} /> 필터
              </button>
            </div>
          </div>
          <div style={{ overflow: "auto" }}>
            <table className="btbl">
              <thead>
                <tr>
                  <th>키워드</th>
                  <th>월간 검색량</th>
                  <th>성장률</th>
                  <th>경쟁도</th>
                  <th>페르소나</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {TRENDS.map((t) => (
                  <tr key={t.kw}>
                    <td style={{ fontWeight: 600 }}>{t.kw}</td>
                    <td className="text-mono">{t.vol.toLocaleString()}</td>
                    <td>
                      <span
                        className={`bchip ${
                          t.growth > 100 ? "bchip--success" : t.growth > 50 ? "bchip--info" : ""
                        }`}
                      >
                        <Icon name="trend" size={11} /> +{t.growth}%
                      </span>
                    </td>
                    <td>
                      <span
                        className={`bchip ${
                          t.comp === "낮음" ? "bchip--success" : t.comp === "높음" ? "bchip--danger" : "bchip--warning"
                        }`}
                      >
                        {t.comp}
                      </span>
                    </td>
                    <td style={{ color: "var(--text-tertiary)" }}>{t.persona}</td>
                    <td style={{ textAlign: "right" }}>
                      <button className="bbtn bbtn--ghost bbtn--sm">
                        아이데이션 <Icon name="chevron" size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "competitor" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {COMPETITORS.map((c) => (
            <div key={c.name} className="bcard">
              <div className="bcard__body">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 9,
                      background: "var(--brand-50)",
                      color: "var(--brand-600)",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 700,
                    }}
                  >
                    {c.name[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>최근 수집: 2시간 전</div>
                  </div>
                  <span className="bchip bchip--success" style={{ marginLeft: "auto" }}>
                    <span className="bchip__dot" /> 동기화
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "12px 0" }}>
                  <Metric k="수집 포스트" v={c.posts.toString()} />
                  <Metric k="평균 읽기 시간" v={c.avgRead} />
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {c.topics.map((t) => (
                    <span key={t} className="bchip">
                      #{t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <div
            className="bcard"
            style={{
              display: "grid",
              placeItems: "center",
              minHeight: 180,
              borderStyle: "dashed",
              background: "var(--bg-subtle)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "white",
                  border: "1px solid var(--border-default)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 10px",
                }}
              >
                <Icon name="plus" />
              </div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>경쟁사 URL 추가</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                RSS/사이트맵 자동 감지
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "product" && (
        <div className="bcard">
          <div className="bcard__body">
            <div style={{ fontWeight: 600, marginBottom: 12 }}>플라트 자사 인덱스</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                "매물 카탈로그 (1,842건)",
                "FAQ 데이터셋 (218건)",
                "게스트 리뷰 스니펫 (3,104건)",
                "유학생 커뮤니티 멘션",
                "예약 전환 로그",
                "호스트 인터뷰 아카이브",
              ].map((x) => (
                <div
                  key={x}
                  style={{
                    padding: 14,
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-md)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--bg-subtle)",
                  }}
                >
                  <Icon name="link" size={14} />
                  <span style={{ fontSize: 13 }}>{x}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Metric({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ padding: "8px 10px", background: "var(--bg-subtle)", borderRadius: "var(--r-sm)" }}>
      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{k}</div>
      <div style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{v}</div>
    </div>
  )
}
