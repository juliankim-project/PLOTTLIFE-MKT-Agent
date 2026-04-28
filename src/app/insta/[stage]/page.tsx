import Link from "next/link"
import { notFound } from "next/navigation"

interface StageInfo {
  num: string
  emoji: string
  label: string
  intro: string
  bullets: string[]
}

const STAGES: Record<string, StageInfo> = {
  trends: {
    num: "01",
    emoji: "🔥",
    label: "트렌드·해시태그",
    intro: "인스타 인사이트·해시태그·경쟁계정·시즌 이벤트로 토픽 풀을 만든다.",
    bullets: [
      "해시태그 카탈로그 + 카테고리 필터 (지역·라이프·시즌·이벤트·브랜드)",
      "size_band: big / medium / niche / brand 별 분류",
      "경쟁 계정 최신 포스트 그리드 (이미지·캡션·인게이지먼트)",
      "DB: insta_hashtags · 외부 데이터 소스(IG Graph · Apify 등)",
    ],
  },
  ideation: {
    num: "02",
    emoji: "✨",
    label: "포스트 아이데이션",
    intro: "세그먼트·여정·목적 + 포맷(single/carousel/reel) 4축으로 30~50개 포스트 생성.",
    bullets: [
      "블로그 Compass + 포맷 축 (single/carousel/reel)",
      "여정 × 포맷 매트릭스로 결과 시각화",
      "AI: insta-strategist · gemini-2.5-flash JSON 모드",
      "출력: title, format, slide_count, hook, first_caption_line, fit_score",
    ],
  },
  topics: {
    num: "03",
    emoji: "🎯",
    label: "포스트 브리프",
    intro: "1개 포스트의 슬라이드 구조·hook·CTA·해시태그 셋트·이미지 프롬프트 확정.",
    bullets: [
      "슬라이드 구조: 1번 hook · 2~N-1번 본문 · N번 CTA",
      "캡션 초안: 첫 줄 hook + 본문 + CTA + 해시태그",
      "해시태그 셋트: big 3~5 / medium 5~10 / niche 5~10 / brand 1~2",
      "슬라이드별 Imagen 4 프롬프트 (영문, photorealistic)",
    ],
  },
  posts: {
    num: "04",
    emoji: "🎨",
    label: "카드 제작",
    intro: "슬라이드별 Imagen 4 이미지 + 오버레이 텍스트 + 통합 캡션 작성.",
    bullets: [
      "에디터: 슬라이드 분할 뷰 (캔버스 미리보기 + 메타 편집)",
      "각 슬라이드 1080×1080 또는 1080×1350 4:5",
      "오버레이는 클라이언트 SVG/Canvas 합성 (Imagen 텍스트 안정성 ↓)",
      "DB: insta_posts + insta_slides (1:N)",
    ],
  },
  review: {
    num: "05",
    emoji: "✅",
    label: "검수",
    intro: "Hook 강도·해시태그 정합·광고 표시·저작권·인스타 가이드라인 체크.",
    bullets: [
      "SEO·발견: 첫 줄 hook · 해시태그 30개 이내 · 금지태그 없음",
      "정확성·법적: 광고 표시 · 저작권 · 출처 명시",
      "시각·브랜드: hook 강도 · 폰트 24px+ · 톤·컬러 일관",
      "플랫폼 정책: 미성년자·사칭·혐오 표현 점검",
    ],
  },
  contents: {
    num: "06",
    emoji: "📚",
    label: "콘텐츠 관리",
    intro: "저장됨/발행예정/발행완료 상태 관리 + 발행 세팅 모달.",
    bullets: [
      "필터: 전체 / 저장됨 / 발행예정 / 발행완료 / 휴지통",
      "행 액션: 편집 · 발행 세팅 · 삭제",
      "발행 세팅 모달: 지금/예약 + (인스타 단일 채널 + FB 동시 발행 옵션)",
      "블로그 contents 페이지 패턴 그대로 — 컴포넌트 재사용 가능",
    ],
  },
  publish: {
    num: "07",
    emoji: "🚀",
    label: "발행관리",
    intro: "Instagram Graph API 호출. 캐러셀 컨테이너 → publish. 자동 첫 댓글 옵션.",
    bullets: [
      "IG 비즈니스 계정 연결 + Long-lived token 만료 모니터링",
      "Graph API 3단계: 슬라이드 container → carousel container → publish",
      "Vercel Cron 5분 단위로 예약 큐 처리 (api/cron/insta-publish)",
      "자동 첫 댓글 (해시태그 분리 옵션) + 페이스북 동시 발행",
    ],
  },
  analyze: {
    num: "08",
    emoji: "📊",
    label: "성과분석",
    intro: "도달·저장·공유·DM·팔로우 전환·캐러셀 슬라이드별 도달률 → 트렌드 단계로 회수.",
    bullets: [
      "IG Insights API 일 1회 동기화 (api/cron/insta-metrics)",
      "핵심 지표: 도달 · 노출 · 저장 · 공유 · 프로필 방문 · 팔로우 전환",
      "캐러셀 인사이트: 슬라이드별 좌→우 스크롤 도달률",
      "시간대별·해시태그별 성과 → 다음 사이클 트렌드 탭으로 피드백",
    ],
  },
}

export default async function InstaStagePage({
  params,
}: {
  params: Promise<{ stage: string }>
}) {
  const { stage } = await params
  const info = STAGES[stage]
  if (!info) notFound()

  return (
    <div className="bpage fade-up">
      <div className="page-header">
        <span className="page-header__eyebrow">
          📷 INSTA · STAGE {info.num}
        </span>
        <h1 className="page-header__title">
          {info.emoji} {info.label}
        </h1>
        <p className="page-header__sub">{info.intro}</p>
      </div>

      {/* Coming Soon 안내 */}
      <div
        style={{
          padding: "32px 24px",
          background: "linear-gradient(135deg, #fdf4ff 0%, #ffe4e6 50%, #fff7ed 100%)",
          border: "1px solid #fce7f3",
          borderRadius: 14,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 36, lineHeight: 1 }}>🚧</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#9f1239", letterSpacing: "-0.01em" }}>
              빌드 진행 예정 — Stage {info.num}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 2 }}>
              구조·디자인 토큰만 정의된 상태입니다. 가이드 문서대로 클로드가 구축합니다.
            </div>
          </div>
        </div>

        <div
          style={{
            background: "white",
            border: "1px solid #fce7f3",
            borderRadius: 10,
            padding: "14px 18px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: ".06em",
              marginBottom: 8,
            }}
          >
            이 단계에서 할 일
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.8, color: "var(--text-primary)" }}>
            {info.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* 가이드 안내 */}
      <div
        style={{
          padding: "14px 18px",
          background: "var(--bg-subtle)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 12,
          fontSize: 12.5,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: ".06em",
            marginBottom: 6,
          }}
        >
          📋 빌드 가이드 문서
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
        </code>
        <span style={{ marginLeft: 8 }}>
          를 클로드에 입력하면 DB → API → UI 단계별로 PR 묶어 빌드합니다.
        </span>
      </div>

      <Link
        href="/insta"
        style={{
          fontSize: 12.5,
          color: "var(--brand-600)",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        ← 인스타 여정 맵으로
      </Link>
    </div>
  )
}

export function generateStaticParams() {
  return Object.keys(STAGES).map((stage) => ({ stage }))
}
