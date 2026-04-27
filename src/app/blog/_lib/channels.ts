/**
 * 발행 채널 정의 — 발행관리 페이지 + 콘텐츠 관리 발행 세팅 모달 공유.
 */

export interface PublishChannel {
  id: string
  name: string
  emoji: string
  format: string
  desc: string
  account: string
  /** 글로벌 ON/OFF — 발행관리에서 토글 (현재는 mock 기본값) */
  defaultEnabled: boolean
}

export const CHANNELS: PublishChannel[] = [
  {
    id: "official",
    name: "플라트 오피셜 블로그",
    emoji: "🏠",
    format: "롱폼 HTML",
    desc: "본문 그대로 발행 · SEO 메타 태그 자동 주입",
    account: "blog@plottlife",
    defaultEnabled: true,
  },
  {
    id: "naver",
    name: "네이버 블로그",
    emoji: "🟢",
    format: "에디터 변환",
    desc: "네이버 에디터 포맷으로 변환 (이미지·표 호환)",
    account: "naver-bot",
    defaultEnabled: true,
  },
  {
    id: "newsletter",
    name: "뉴스레터",
    emoji: "📧",
    format: "요약본 + CTA",
    desc: "Stibee 발송 · 본문 요약 600자 + 본문 링크",
    account: "stibee",
    defaultEnabled: true,
  },
  {
    id: "instagram",
    name: "Instagram",
    emoji: "📷",
    format: "카드 5컷",
    desc: "Social Creator 가 카드뉴스 5장으로 변환",
    account: "ig-official",
    defaultEnabled: true,
  },
  {
    id: "x",
    name: "X / Threads",
    emoji: "🐦",
    format: "스레드 트윗",
    desc: "Social Creator 가 4~6개 트윗 스레드로 변환",
    account: "x-official",
    defaultEnabled: true,
  },
  {
    id: "medium",
    name: "Medium 영문",
    emoji: "📰",
    format: "영문 번역",
    desc: "Copywriter 가 영문 번역 + Medium 포맷",
    account: "—",
    defaultEnabled: false,
  },
]

export const CHANNEL_BY_ID: Record<string, PublishChannel> = Object.fromEntries(
  CHANNELS.map((c) => [c.id, c])
)
