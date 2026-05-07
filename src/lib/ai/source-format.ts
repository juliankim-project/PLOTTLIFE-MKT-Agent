/**
 * Grounding sources 포맷팅 — 본문 끝 "참고 출처" 섹션 생성기.
 *
 * 책임:
 *  1) 호스트 추출 (Vertex grounding redirect URL 감안)
 *  2) 같은 호스트끼리 그룹화 — 중복 매체 한 줄 처리
 *  3) 매체별 다른 페이지(서브패스) 는 sub-title 로 합쳐 표기
 *  4) 도메인 → 한국어 매체명 매핑 (출입국·외국인청, 조선일보, Reddit 등)
 */

import "server-only"
import type { GroundingSource } from "./provider"
import { isBannedCompetitorDomain } from "../blog/banned-brands"

/* ─── 화이트리스트 (writer · reviewer 공용) ─────────────────── */

/**
 * 정책: **허용된 카테고리만 통과** (블랙리스트가 아닌 화이트리스트).
 *  - 정부·공공·학술 (.go.kr / .or.kr / .ac.kr / .gov / .edu)
 *  - 위키 (wikipedia, namu.wiki)
 *  - 주요 뉴스 매체 (한국·글로벌)
 *  - 커뮤니티·Q&A (Reddit, Quora, Stack Exchange)
 *  - 국제기구·학술 논문 DB
 *
 * 그 외 — 호텔/리조트, OTA, 타사 단기임대, 일반 기업·중개업체 사이트 등 전부 제외.
 * 사유: 우리 콘텐츠 출처에 경쟁사·타사 약관 노출 시 법적 리스크 + 브랜드 일관성 훼손.
 */
export const ALLOWED_SOURCE_PATTERNS: RegExp[] = [
  /* 한국 정부·공공·학술 */
  /\.go\.kr(\b|\/|$)/i, /\.or\.kr(\b|\/|$)/i, /\.ac\.kr(\b|\/|$)/i,
  /\.re\.kr(\b|\/|$)/i, /\.mil\.kr(\b|\/|$)/i,
  /* 글로벌 정부·교육·국제기구 */
  /\.gov(\b|\/|\.)/i, /\.edu(\b|\/|\.)/i, /\.int(\b|\/|\.)/i,
  /\boecd\.org/i, /\bun\.org/i, /\bwho\.int/i, /\bworldbank\.org/i, /\bimf\.org/i,
  /* 위키·백과 */
  /wikipedia\.org/i, /wikimedia\.org/i, /namu\.wiki/i,
  /* 한국 주요 뉴스 */
  /chosun\.com/i, /joongang\.co\.kr/i, /donga\.com/i, /hani\.co\.kr/i,
  /khan\.co\.kr/i, /hankyung\.com/i, /mk\.co\.kr/i, /mt\.co\.kr/i,
  /asiae\.co\.kr/i, /yna\.co\.kr/i, /yonhapnews\.co\.kr/i,
  /sbs\.co\.kr/i, /imbc\.com/i, /jtbc\.co\.kr/i, /kbs\.co\.kr/i,
  /ohmynews\.com/i, /pressian\.com/i, /seoul\.co\.kr/i, /segye\.com/i,
  /kmib\.co\.kr/i, /etnews\.com/i, /koreaherald\.com/i, /koreatimes\.co\.kr/i,
  /news\.naver\.com/i, /news\.daum\.net/i, /v\.daum\.net/i,
  /newsis\.com/i, /nocutnews\.co\.kr/i, /\bytn\.co\.kr/i, /channela\.com/i,
  /* 글로벌 뉴스·통신 */
  /nytimes\.com/i, /\bbbc\.(com|co\.uk)/i, /reuters\.com/i, /bloomberg\.com/i,
  /\bft\.com/i, /\bwsj\.com/i, /theguardian\.com/i, /economist\.com/i,
  /apnews\.com/i, /\bcnn\.com/i, /forbes\.com/i, /aljazeera\.com/i,
  /washingtonpost\.com/i, /npr\.org/i, /scmp\.com/i, /nikkei\.com/i,
  /* 커뮤니티·Q&A */
  /reddit\.com/i, /quora\.com/i, /stackexchange\.com/i, /stackoverflow\.com/i,
  /* 학술·논문 DB */
  /scholar\.google/i, /jstor\.org/i, /springer\.com/i, /sciencedirect\.com/i,
  /nature\.com/i, /sciencemag\.org/i, /pubmed/i, /\barxiv\.org/i, /ssrn\.com/i,
  /dbpia\.co\.kr/i, /riss\.kr/i, /kiss\.kstudy\.com/i,
]

/** 약관·개인정보 페이지 등 — 화이트리스트 도메인이라도 거부 */
export const HARD_BLOCK_URL_PATTERNS: RegExp[] = [
  /\/terms/i, /\/privacy/i, /\/policy/i, /\/tos\b/i, /\/agreement/i,
  /약관/, /이용약관/, /개인정보처리/,
]

export function isAllowedSource(s: { uri?: string; domain?: string; title?: string }): boolean {
  const url = (s.uri ?? "").toLowerCase()
  const domain = (s.domain ?? "").toLowerCase()
  const title = (s.title ?? "").toLowerCase()
  /* 경쟁사·OTA 도메인 즉시 hard block (화이트리스트 매칭 전) */
  if (isBannedCompetitorDomain(domain)) return false
  /* 약관·이용약관 URL 즉시 거부 (화이트리스트 도메인이어도) */
  if (HARD_BLOCK_URL_PATTERNS.some((re) => re.test(url) || re.test(title))) return false
  /* 화이트리스트 매칭 — uri/domain/title 셋 중 하나라도 통과 */
  return ALLOWED_SOURCE_PATTERNS.some((re) => re.test(url) || re.test(domain) || re.test(title))
}

/* 호스트 → 한국어 매체명 매핑 (없으면 grounding domain → hostname 순) */
const PUBLISHER_MAP: Record<string, string> = {
  /* 정부·공공기관 */
  "immigration.go.kr": "출입국·외국인청",
  "hikorea.go.kr": "Hi Korea (출입국 포털)",
  "moj.go.kr": "법무부",
  "molit.go.kr": "국토교통부",
  "mois.go.kr": "행정안전부",
  "moe.go.kr": "교육부",
  "mofa.go.kr": "외교부",
  "moel.go.kr": "고용노동부",
  "kostat.go.kr": "통계청",
  "kosis.kr": "국가통계포털 KOSIS",
  "law.go.kr": "국가법령정보센터",
  "easylaw.go.kr": "찾기쉬운 생활법령정보",
  "klac.or.kr": "대한법률구조공단",
  "reb.or.kr": "한국부동산원",
  "lh.or.kr": "한국토지주택공사 LH",
  "knto.or.kr": "한국관광공사",
  "visitkorea.or.kr": "한국관광공사",
  /* 위키 */
  "wikipedia.org": "Wikipedia",
  "ko.wikipedia.org": "Wikipedia",
  "en.wikipedia.org": "Wikipedia",
  "namu.wiki": "나무위키",
  /* 포털 뉴스 (개별 매체보다 포털 노출이 흔함) */
  "news.naver.com": "네이버 뉴스",
  "n.news.naver.com": "네이버 뉴스",
  "news.daum.net": "다음 뉴스",
  "v.daum.net": "다음 뉴스",
  "m.daum.net": "다음 뉴스",
  /* 한국 주요 뉴스 */
  "chosun.com": "조선일보",
  "joongang.co.kr": "중앙일보",
  "donga.com": "동아일보",
  "hani.co.kr": "한겨레",
  "khan.co.kr": "경향신문",
  "hankyung.com": "한국경제",
  "mk.co.kr": "매일경제",
  "mt.co.kr": "머니투데이",
  "asiae.co.kr": "아시아경제",
  "etnews.com": "전자신문",
  "yna.co.kr": "연합뉴스",
  "yonhapnews.co.kr": "연합뉴스",
  "newsis.com": "뉴시스",
  "sbs.co.kr": "SBS",
  "imbc.com": "MBC",
  "jtbc.co.kr": "JTBC",
  "kbs.co.kr": "KBS",
  "ytn.co.kr": "YTN",
  "ohmynews.com": "오마이뉴스",
  "pressian.com": "프레시안",
  "seoul.co.kr": "서울신문",
  "kmib.co.kr": "국민일보",
  "koreaherald.com": "Korea Herald",
  "koreatimes.co.kr": "Korea Times",
  /* 글로벌 뉴스 */
  "nytimes.com": "The New York Times",
  "bbc.com": "BBC",
  "bbc.co.uk": "BBC",
  "reuters.com": "Reuters",
  "bloomberg.com": "Bloomberg",
  "ft.com": "Financial Times",
  "wsj.com": "Wall Street Journal",
  "theguardian.com": "The Guardian",
  "economist.com": "The Economist",
  "apnews.com": "AP News",
  "cnn.com": "CNN",
  "forbes.com": "Forbes",
  "scmp.com": "South China Morning Post",
  "nikkei.com": "Nikkei",
  /* 커뮤니티·Q&A */
  "reddit.com": "Reddit",
  "quora.com": "Quora",
  "stackexchange.com": "Stack Exchange",
  "stackoverflow.com": "Stack Overflow",
  /* 학술 */
  "scholar.google.com": "Google Scholar",
  "jstor.org": "JSTOR",
  "springer.com": "Springer",
  "sciencedirect.com": "ScienceDirect",
  "nature.com": "Nature",
  "pubmed.ncbi.nlm.nih.gov": "PubMed",
  "arxiv.org": "arXiv",
  "ssrn.com": "SSRN",
  "dbpia.co.kr": "DBpia",
  "riss.kr": "RISS",
  /* 국제기구 */
  "oecd.org": "OECD",
  "un.org": "UN",
  "who.int": "WHO",
  "worldbank.org": "World Bank",
  "imf.org": "IMF",
}

/** Vertex grounding redirect URL 패턴 — 진짜 publisher 는 domain 필드에 있음 */
const REDIRECT_HOST_PATTERNS = [
  /vertexaisearch/i,
  /googleusercontent/i,
  /google\.com\/url/i,
]

function extractHost(s: GroundingSource): string {
  /* 1) URL 파싱 시도 */
  let host = ""
  try {
    host = new URL(s.uri).hostname.replace(/^www\./, "").toLowerCase()
  } catch {
    /* invalid URL */
  }
  /* 2) Vertex grounding redirect 면 domain 필드를 진짜 host 로 */
  if (!host || REDIRECT_HOST_PATTERNS.some((re) => re.test(host))) {
    if (s.domain) {
      return s.domain.replace(/^www\./, "").toLowerCase()
    }
  }
  return host
}

/** host 매칭 — 정확 일치 또는 서픽스 매칭 (e.g. "news.naver.com" → "naver.com") */
function resolvePublisher(host: string): string {
  if (!host) return ""
  if (PUBLISHER_MAP[host]) return PUBLISHER_MAP[host]
  /* 서브도메인 매칭: news.kbs.co.kr → kbs.co.kr */
  for (const key of Object.keys(PUBLISHER_MAP)) {
    if (host.endsWith("." + key)) return PUBLISHER_MAP[key]
  }
  /* 매핑 없음 — host 그대로 (사람이 읽기에 도메인이라도 있는 게 나음) */
  return host
}

/** title 정리 — 너무 길면 자름, 일반적인 사이트명·메타 텍스트·URL 형태는 제거 */
function cleanTitle(title: string | undefined, publisher: string): string {
  if (!title) return ""
  let t = title.trim()
  /* URL 또는 도메인 형태면 비우기 (사용자 클릭 유도 X — 텍스트만) */
  if (/^https?:\/\//i.test(t)) return ""
  if (/^[\w.-]+\.(com|kr|co\.kr|or\.kr|go\.kr|ac\.kr|net|org|edu|gov|int)(\/[^\s]*)?$/i.test(t)) return ""
  /* 끝의 " - 매체명" 또는 " | 매체명" 제거 */
  t = t.replace(/\s*[-|·]\s*[^-|·]+\s*$/, (m) => {
    const tail = m.replace(/^\s*[-|·]\s*/, "").trim()
    if (tail.toLowerCase().includes(publisher.toLowerCase())) return ""
    return m
  })
  /* 너무 짧으면(매체명 자체) 비우기 */
  if (t.length < 4 || t.toLowerCase() === publisher.toLowerCase()) return ""
  /* 길이 제한 */
  if (t.length > 50) t = t.slice(0, 48) + "…"
  return t
}

interface PublisherGroup {
  publisher: string
  titles: string[]
}

/**
 * sources 를 publisher 기준으로 그룹화.
 * 같은 매체 → 한 줄, 다른 페이지 제목들은 sub-title 로 합쳐 표시.
 */
export function groupSources(sources: GroundingSource[]): PublisherGroup[] {
  const groups = new Map<string, PublisherGroup>()
  for (const s of sources) {
    const host = extractHost(s)
    const publisher = resolvePublisher(host)
    if (!publisher) continue
    const key = publisher.toLowerCase()
    if (!groups.has(key)) {
      groups.set(key, { publisher, titles: [] })
    }
    const g = groups.get(key)!
    const title = cleanTitle(s.title, publisher)
    if (title && !g.titles.includes(title)) g.titles.push(title)
  }
  return Array.from(groups.values())
}

/**
 * 본문 끝에 첨부할 "참고 출처" 마크다운 블록.
 * 각 매체당 최대 2개 sub-title + "외 N건" 으로 압축. 매체는 최대 8개.
 */
export function formatSourceSection(sources: GroundingSource[]): string {
  const groups = groupSources(sources)
  if (groups.length === 0) return ""
  const lines: string[] = []
  for (const g of groups.slice(0, 8)) {
    if (g.titles.length === 0) {
      lines.push(`- **${g.publisher}**`)
      continue
    }
    const head = g.titles.slice(0, 2)
    const more = g.titles.length - 2
    const right = more > 0 ? `${head.join(" · ")} 외 ${more}건` : head.join(" · ")
    lines.push(`- **${g.publisher}** — ${right}`)
  }
  return `\n\n---\n\n## 📚 참고 출처\n\n본 콘텐츠는 다음 공식 자료를 참고해 작성됐습니다.\n\n${lines.join("\n")}\n`
}
