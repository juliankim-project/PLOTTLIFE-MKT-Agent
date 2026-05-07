"use client"

import { useState } from "react"
import Link from "next/link"
import { STAGES } from "./_lib/stages"
import { Icon, MiniKPI, CatCard, SectionHead } from "./_ui"

export default function JourneyMapPage() {
  const [focused, setFocused] = useState<string | null>(null)

  return (
    <div className="bpage fade-up">
      <div className="page-header">
        <span className="page-header__eyebrow">
          <Icon name="flow" size={12} /> BLOG AUTOMATION JOURNEY
        </span>
        <h1 className="page-header__title">단기임대 블로그 자동화 · 유저 여정 한판</h1>
        <p className="page-header__sub">
          플라트 라이프 블로그 파이프라인 7단계를 한 화면에. 리서치부터 성과분석까지 각 단계의 인풋·출력물·담당 에이전트가
          구조화되어 있고, 카드를 클릭하면 해당 단계로 이동합니다.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <MiniKPI label="활성 프로젝트" value="12" delta="+3 이번 주" tone="up" icon="bolt" />
        <MiniKPI label="이번 달 발행" value="28" delta="목표 35건" tone="neutral" icon="send" />
        <MiniKPI label="파이프라인 토픽" value="147" delta="+42 아이데이션" tone="up" icon="sparkles" />
        <MiniKPI label="평균 소요" value="4.2일" delta="−1.3일 vs. 수동" tone="up" icon="clock" />
      </div>

      <div className="journey-band">
        <div className="journey-band__scale">
          {[0, 25, 50, 75, 100].map((p) => (
            <div key={p} className="journey-band__tick" style={{ left: `${p}%` }}>
              <span>{p === 0 ? "시작" : p === 100 ? "회수" : ""}</span>
            </div>
          ))}
        </div>

        <div className="journey-grid">
          {STAGES.map((s) => {
            const active = focused === s.id
            const isFunnelHot = s.id === "ideation" || s.id === "topics"
            return (
              <Link
                key={s.id}
                href={s.href}
                onMouseEnter={() => setFocused(s.id)}
                onMouseLeave={() => setFocused(null)}
                className={`j-card${active ? " j-card--active" : ""}${isFunnelHot ? " j-card--hot" : ""}`}
                style={{ ["--accent" as string]: s.color } as React.CSSProperties}
              >
                <div className="j-card__rail" />
                <div className="j-card__head">
                  <div className="j-card__order">{String(s.order).padStart(2, "0")}</div>
                  <div className="j-card__icon">
                    <Icon name={s.icon} size={15} />
                  </div>
                </div>
                <div className="j-card__title">{s.label}</div>
                <div className="j-card__en">{s.en}</div>
                <p className="j-card__desc">{s.desc}</p>

                <div className="j-card__meta">
                  <div className="j-card__meta-row">
                    <span className="j-card__meta-k">인풋</span>
                    <div className="j-card__meta-v">
                      {s.inputs.slice(0, 2).map((t) => (
                        <span key={t} className="mini-pill">
                          {t}
                        </span>
                      ))}
                      {s.inputs.length > 2 && (
                        <span className="mini-pill mini-pill--muted">+{s.inputs.length - 2}</span>
                      )}
                    </div>
                  </div>
                  <div className="j-card__meta-row">
                    <span className="j-card__meta-k">출력</span>
                    <div className="j-card__meta-v">
                      {s.outputs.map((t) => (
                        <span key={t} className="mini-pill mini-pill--out">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="j-card__foot">
                  <div>
                    <div className="j-card__foot-k">{s.kpi}</div>
                    <div className="j-card__foot-v">{s.kpiValue}</div>
                  </div>
                  <div className="j-card__cta">
                    열기 <Icon name="chevron" size={12} />
                  </div>
                </div>

                {isFunnelHot && <div className="j-card__hot-tag">이번 분기 집중</div>}
              </Link>
            )
          })}
        </div>

        <div className="j-flow">
          {STAGES.map((s, i) => (
            <div key={s.id} style={{ display: "contents" }}>
              <div className="j-flow__node" style={{ background: s.color }} />
              {i < STAGES.length - 1 && <div className="j-flow__seg" />}
            </div>
          ))}
        </div>
      </div>

      <SectionHead
        title="여정별 필요 요소 카테고리"
        sub="각 단계에서 요구되는 데이터·에이전트·산출물을 단기임대 도메인으로 정리했습니다."
      />

      <div className="cat-grid">
        <CatCard
          icon="globe"
          tone="cyan"
          title="데이터 인풋"
          sub="리서치~아이데이션 단계의 연료"
          items={[
            "네이버·구글 트렌드 (외국인 유학생/단기임대 키워드)",
            "경쟁사 블로그 (엔코스테이·미스터멘션·Airbnb)",
            "플라트 매물 DB · 예약 로그",
            "유학생 커뮤니티 / 노마드 포럼",
            "게스트 리뷰 · FAQ 스니펫",
          ]}
        />
        <CatCard
          icon="sparkles"
          tone="violet"
          title="AI 에이전트 8종"
          sub="각 단계 자동화 담당"
          items={[
            "SEO Auditor · 검색 갭 분석",
            "Content Strategist · 여정·브리프",
            "Marketing Psychologist · 페르소나 매칭",
            "Copywriter · 초안 작성",
            "Social Content Creator · 리퍼포징",
            "Email Marketer · 뉴스레터",
            "Performance Marketer · 성과 분석",
            "Creative Designer · 커버·비주얼",
          ]}
        />
        <CatCard
          icon="target"
          tone="indigo"
          title="의사결정 기준"
          sub="주제선정 스코어링에 사용"
          items={[
            "월간 검색량 (네이버 + 구글)",
            "경쟁도 (상위 10 SERP 분석)",
            "페르소나 매칭 (유학/주재/노마드/여행/내국인)",
            "플라트 매물 매칭도",
            "계절성·시즌 타이밍",
            "과거 성과 예측 모델",
          ]}
        />
        <CatCard
          icon="chart"
          tone="rose"
          title="성과 지표"
          sub="다음 여정의 인풋으로 회수"
          items={[
            "PV / UV",
            "평균 체류시간 · 스크롤 깊이",
            "SERP 랭킹 (타겟 키워드)",
            "예약 전환율 (매물 CTA 클릭 → 예약)",
            '브랜드 검색량 ("플라트 라이프")',
          ]}
        />
      </div>

      <style>{`
        .blog-shell .journey-band {
          position: relative;
          background: var(--bg-surface);
          border: 1px solid var(--border-default);
          border-radius: var(--r-xl);
          padding: 22px 20px 28px;
          margin-bottom: 36px;
          box-shadow: var(--shadow-xs);
        }
        .blog-shell .journey-band__scale {
          position: relative;
          height: 0;
          margin-bottom: 16px;
        }
        .blog-shell .journey-band__tick {
          position: absolute;
          top: 0;
          transform: translateX(-50%);
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }
        .blog-shell .journey-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
          gap: 10px;
        }
        .blog-shell .j-card {
          position: relative;
          padding: 14px 14px 12px;
          border: 1px solid var(--border-default);
          border-radius: var(--r-lg);
          background: var(--bg-surface);
          cursor: pointer;
          transition: all 0.18s ease;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 260px;
          overflow: hidden;
          color: inherit;
          text-decoration: none;
        }
        .blog-shell .j-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
          border-color: var(--accent);
        }
        .blog-shell .j-card--hot {
          background: linear-gradient(180deg, color-mix(in oklch, var(--accent) 6%, white), var(--bg-surface));
          border-color: color-mix(in oklch, var(--accent) 30%, var(--border-default));
        }
        .blog-shell .j-card__rail {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: var(--accent);
        }
        .blog-shell .j-card__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 4px;
        }
        .blog-shell .j-card__order {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: 0.04em;
        }
        .blog-shell .j-card__icon {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          background: color-mix(in oklch, var(--accent) 12%, white);
          color: var(--accent);
          display: grid;
          place-items: center;
        }
        .blog-shell .j-card__title {
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .blog-shell .j-card__en {
          font-size: 10.5px;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          font-weight: 500;
          margin-top: -4px;
        }
        .blog-shell .j-card__desc {
          font-size: 12px;
          color: var(--text-tertiary);
          line-height: 1.45;
          margin: 2px 0 0;
        }
        .blog-shell .j-card__meta {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px dashed var(--border-subtle);
        }
        .blog-shell .j-card__meta-row {
          display: flex;
          gap: 6px;
        }
        .blog-shell .j-card__meta-k {
          font-size: 10px;
          color: var(--text-muted);
          font-weight: 600;
          width: 26px;
          padding-top: 3px;
          letter-spacing: 0.04em;
        }
        .blog-shell .j-card__meta-v {
          display: flex;
          flex-wrap: wrap;
          gap: 3px;
          flex: 1;
        }
        .blog-shell .mini-pill {
          display: inline-flex;
          align-items: center;
          padding: 2px 7px;
          border-radius: var(--r-sm);
          background: var(--bg-muted);
          color: var(--text-secondary);
          font-size: 10.5px;
          font-weight: 500;
          border: 1px solid transparent;
        }
        .blog-shell .mini-pill--out {
          background: color-mix(in oklch, var(--accent) 10%, white);
          color: color-mix(in oklch, var(--accent) 80%, black);
        }
        .blog-shell .mini-pill--muted {
          background: transparent;
          color: var(--text-muted);
        }
        .blog-shell .j-card__foot {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-top: 8px;
        }
        .blog-shell .j-card__foot-k {
          font-size: 10px;
          color: var(--text-muted);
        }
        .blog-shell .j-card__foot-v {
          font-size: 18px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.02em;
        }
        .blog-shell .j-card__cta {
          font-size: 11px;
          font-weight: 600;
          color: var(--accent);
          display: inline-flex;
          align-items: center;
          gap: 2px;
        }
        .blog-shell .j-card__hot-tag {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 2px 7px;
          border-radius: 4px;
          background: var(--accent);
          color: white;
        }
        .blog-shell .j-flow {
          display: flex;
          align-items: center;
          padding: 24px 26px 4px;
        }
        .blog-shell .j-flow__node {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
          box-shadow: 0 0 0 4px color-mix(in oklch, currentColor 15%, white);
        }
        .blog-shell .j-flow__seg {
          flex: 1;
          height: 2px;
          background-image: repeating-linear-gradient(90deg, var(--border-strong) 0 4px, transparent 4px 8px);
        }
        .blog-shell .cat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
      `}</style>
    </div>
  )
}
