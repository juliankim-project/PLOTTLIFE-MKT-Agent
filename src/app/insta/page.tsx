"use client"

import Link from "next/link"

interface InstaStage {
  num: string
  emoji: string
  label: string
  desc: string
  href: string
  inputs: string[]
  outputs: string[]
}

const STAGES: InstaStage[] = [
  {
    num: "01",
    emoji: "🔥",
    label: "트렌드·해시태그",
    desc: "인스타 인사이트·해시태그·경쟁계정·시즌 이벤트로 토픽 풀을 만든다.",
    href: "/insta/trends",
    inputs: ["IG 인사이트", "해시태그 카탈로그", "경쟁 계정"],
    outputs: ["트렌드 토픽", "해시태그 풀"],
  },
  {
    num: "02",
    emoji: "✨",
    label: "포스트 아이데이션",
    desc: "세그먼트·여정·목적 + 포맷(single/carousel/reel) 4축으로 30~50개 포스트 생성.",
    href: "/insta/ideation",
    inputs: ["3축 Compass", "포맷 축", "페르소나"],
    outputs: ["포스트 후보", "shortlist"],
  },
  {
    num: "03",
    emoji: "🎯",
    label: "포스트 브리프",
    desc: "1개 포스트의 슬라이드 구조·hook·CTA·해시태그 셋트·이미지 프롬프트 확정.",
    href: "/insta/topics",
    inputs: ["선정 포스트", "여정 단계", "포맷"],
    outputs: ["슬라이드 아웃라인", "캡션 초안"],
  },
  {
    num: "04",
    emoji: "🎨",
    label: "카드 제작",
    desc: "슬라이드별 Imagen 4 이미지 + 오버레이 텍스트 + 통합 캡션 작성.",
    href: "/insta/posts",
    inputs: ["브리프", "Imagen 프롬프트", "오버레이 카피"],
    outputs: ["슬라이드 1~10", "캡션·해시태그"],
  },
  {
    num: "05",
    emoji: "✅",
    label: "검수",
    desc: "Hook 강도·해시태그 정합·광고 표시·저작권·인스타 가이드라인 체크.",
    href: "/insta/review",
    inputs: ["완성 포스트", "체크리스트", "정책 룰"],
    outputs: ["승인본"],
  },
  {
    num: "06",
    emoji: "📚",
    label: "콘텐츠 관리",
    desc: "저장됨/발행예정/발행완료 상태 관리 + 발행 세팅 모달.",
    href: "/insta/contents",
    inputs: ["승인본", "편집 이력"],
    outputs: ["저장됨·예정·완료"],
  },
  {
    num: "07",
    emoji: "🚀",
    label: "발행관리",
    desc: "Instagram Graph API 호출. 캐러셀 컨테이너 → publish. 자동 첫 댓글 옵션.",
    href: "/insta/publish",
    inputs: ["IG 비즈니스 계정", "예약 큐"],
    outputs: ["발행물", "permalink"],
  },
  {
    num: "08",
    emoji: "📊",
    label: "성과분석",
    desc: "도달·저장·공유·DM·팔로우 전환·캐러셀 슬라이드별 도달률 → 트렌드 단계로 회수.",
    href: "/insta/analyze",
    inputs: ["IG Insights API", "Permalink"],
    outputs: ["성과 대시보드", "학습 피드백"],
  },
]

export default function InstaJourneyPage() {
  return (
    <div className="bpage fade-up">
      <div className="page-header">
        <span className="page-header__eyebrow">📷 INSTA AUTOMATION JOURNEY</span>
        <h1 className="page-header__title">PLOTT STAY 인스타 콘텐츠 파이프라인</h1>
        <p className="page-header__sub">
          단기임대 STAY 사업부의 인스타그램 피드 콘텐츠 자동화 — 트렌드 탐색부터 발행·성과분석까지 8단계.
          캐러셀(다중 슬라이드) 중심, Imagen 4 이미지 생성 + 인스타 Graph API 발행 통합.
        </p>
      </div>

      {/* 안내 배너 */}
      <div
        style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, #fdf4ff 0%, #ffe4e6 50%, #fff7ed 100%)",
          border: "1px solid #fce7f3",
          borderRadius: 14,
          marginBottom: 18,
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <div style={{ fontSize: 28, lineHeight: 1 }}>📷</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4, color: "#9f1239" }}>
            🚧 인스타 파이프라인 — 빌드 진행 예정
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            현재 8단계 구조와 디자인 토큰만 정의된 상태입니다. 각 단계 페이지는 상세 가이드 문서
            <code style={{ padding: "1px 6px", background: "white", borderRadius: 4, fontSize: 11.5, margin: "0 4px", border: "1px solid #fce7f3" }}>
              docs/INSTA_PIPELINE_GUIDE.md
            </code>
            를 참고해 구축됩니다. 가이드를 클로드에 입력하면 DB·API·UI 전체를 마이그레이션 단위로 빌드할 수 있어요.
          </div>
        </div>
      </div>

      {/* 8단계 카드 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        {STAGES.map((s) => (
          <Link
            key={s.num}
            href={s.href}
            prefetch
            style={{
              background: "white",
              border: "1px solid var(--border-default)",
              borderRadius: 14,
              padding: 16,
              textDecoration: "none",
              color: "inherit",
              transition: "all 0.15s ease",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              minHeight: 200,
            }}
            className="insta-stage-card"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--brand-700)",
                  background: "var(--brand-50)",
                  padding: "2px 8px",
                  borderRadius: 999,
                  letterSpacing: ".04em",
                }}
              >
                {s.num}
              </span>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{s.emoji}</span>
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: "-.01em" }}>
              {s.label}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "var(--text-muted)",
                lineHeight: 1.55,
                flex: 1,
              }}
            >
              {s.desc}
            </div>
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 8, fontSize: 10.5 }}>
              <div style={{ color: "var(--text-muted)", marginBottom: 2 }}>
                <b style={{ color: "var(--text-secondary)" }}>입력</b> · {s.inputs.join(" / ")}
              </div>
              <div style={{ color: "var(--text-muted)" }}>
                <b style={{ color: "var(--text-secondary)" }}>출력</b> · {s.outputs.join(" / ")}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 가이드 문서 안내 */}
      <div
        style={{
          marginTop: 18,
          padding: "14px 18px",
          background: "var(--bg-subtle)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 12,
          fontSize: 12.5,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
          📋 빌드 가이드
        </div>
        <code
          style={{
            padding: "2px 8px",
            background: "white",
            borderRadius: 4,
            fontSize: 12,
            border: "1px solid var(--border-default)",
            fontFamily: "ui-monospace, monospace",
          }}
        >
          docs/INSTA_PIPELINE_GUIDE.md
        </code>{" "}
        — 12단계 마이그레이션 순서, DB 스키마(4 테이블), AI 에이전트 정의, API 트리, UI 페이지 구조,
        Instagram Graph API 발행 플로우, Vercel Cron 예약 발행, 클로드에게 전달할 빌드 지시문까지 포함.
      </div>

      <style jsx>{`
        :global(.insta-stage-card:hover) {
          border-color: var(--brand-300);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.08);
        }
      `}</style>
    </div>
  )
}
