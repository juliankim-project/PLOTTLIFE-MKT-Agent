/**
 * Naver 검색광고 API — 조회 전용 래퍼.
 *
 * ⚠️ 보안/과금 원칙
 *   - 오직 GET 조회 엔드포인트만 호출한다.
 *   - 캠페인·광고 생성/수정/삭제 API는 이 파일에서 아예 노출하지 않는다.
 *     (실수로라도 과금 발생 불가한 구조)
 *
 * 공식 문서: https://naver.github.io/searchad-apidoc/
 */

import "server-only"
import crypto from "node:crypto"

const BASE_URL = "https://api.naver.com"

// ── 설정 로드 ──────────────────────────────────────────────────
function getConfig() {
  const customerId = process.env.NAVER_AD_CUSTOMER_ID
  const apiKey = process.env.NAVER_AD_API_KEY
  const secretKey = process.env.NAVER_AD_SECRET_KEY
  if (!customerId || !apiKey || !secretKey) {
    throw new Error("NAVER_AD_* env 변수가 없어요")
  }
  return { customerId, apiKey, secretKey }
}

// ── HMAC 서명 생성 (Naver Ads spec) ───────────────────────────
function sign(timestamp: string, method: string, uri: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${uri}`
  return crypto.createHmac("sha256", secretKey).update(message).digest("base64")
}

function buildHeaders(method: "GET", uri: string) {
  const { customerId, apiKey, secretKey } = getConfig()
  const timestamp = Date.now().toString()
  const signature = sign(timestamp, method, uri, secretKey)
  return {
    "Content-Type": "application/json; charset=UTF-8",
    "X-Timestamp": timestamp,
    "X-API-KEY": apiKey,
    "X-Customer": customerId,
    "X-Signature": signature,
  }
}

// ── /keywordstool 응답 타입 ────────────────────────────────────
export interface KeywordMetric {
  /** 요청한 또는 연관 키워드 */
  relKeyword: string
  /** PC 월간 검색수 (< 10이면 "< 10" 문자열) */
  monthlyPcQcCnt: number | string
  /** 모바일 월간 검색수 */
  monthlyMobileQcCnt: number | string
  /** PC 월간 평균 노출 광고 수 */
  monthlyAvePcCtr?: number
  monthlyAveMobileCtr?: number
  monthlyAvePcClkCnt?: number
  monthlyAveMobileClkCnt?: number
  /** 경쟁도 (low/middle/high) */
  compIdx?: "낮음" | "중간" | "높음" | string
  /** 월 광고 PC 노출 수 */
  plAvgDepth?: number
}

export interface NormalizedKeywordMetric {
  keyword: string
  monthlyPc: number | null
  monthlyMobile: number | null
  monthlyTotal: number | null
  competition: "low" | "medium" | "high" | "unknown"
  rawCompIdx: string | null
}

function normalizeCount(v: number | string | undefined): number | null {
  if (v == null) return null
  if (typeof v === "number") return v
  if (typeof v === "string") {
    // "< 10" 같은 케이스
    if (v.includes("<")) return 5
    const n = Number(v.replace(/[^0-9.]/g, ""))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function normalizeCompetition(v?: string): NormalizedKeywordMetric["competition"] {
  if (!v) return "unknown"
  if (v === "낮음" || /low/i.test(v)) return "low"
  if (v === "중간" || /middle|med/i.test(v)) return "medium"
  if (v === "높음" || /high/i.test(v)) return "high"
  return "unknown"
}

export function normalizeMetric(m: KeywordMetric): NormalizedKeywordMetric {
  const pc = normalizeCount(m.monthlyPcQcCnt)
  const mo = normalizeCount(m.monthlyMobileQcCnt)
  return {
    keyword: m.relKeyword,
    monthlyPc: pc,
    monthlyMobile: mo,
    monthlyTotal: pc != null && mo != null ? pc + mo : pc ?? mo ?? null,
    competition: normalizeCompetition(m.compIdx),
    rawCompIdx: m.compIdx ?? null,
  }
}

/**
 * keywordstool — 조회 전용.
 * 입력: 1~5개 키워드
 * 출력: 입력한 키워드 + 연관 키워드의 월검색량/경쟁도 (최대 1000개)
 *
 * 사용법:
 *   const metrics = await fetchKeywordMetrics(["성수 단기임대"])
 */
export async function fetchKeywordMetrics(
  keywords: string[],
  opts?: { includeHintRelated?: boolean; maxResults?: number }
): Promise<NormalizedKeywordMetric[]> {
  if (!keywords.length) return []
  if (keywords.length > 5) {
    throw new Error("keywordstool 은 최대 5개 키워드만 지원")
  }

  // Naver 는 공백 제거된 대문자 키워드 권장
  const hintKeywords = keywords.map((k) => k.trim()).filter(Boolean).join(",")
  const showDetail = "1"
  const uri = "/keywordstool"
  const qs = new URLSearchParams({
    hintKeywords,
    showDetail,
    // includeHintKeywords 는 default=1
  })
  const fullPath = `${uri}?${qs.toString()}`

  const headers = buildHeaders("GET", uri)

  const res = await fetch(`${BASE_URL}${fullPath}`, {
    method: "GET",
    headers,
    // 네이버는 gzip 응답 가능성 — Node fetch 자동 처리
    cache: "no-store",
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Naver Ads API ${res.status}: ${body.slice(0, 300)}`)
  }

  const json = (await res.json()) as { keywordList?: KeywordMetric[] }
  const list = Array.isArray(json.keywordList) ? json.keywordList : []
  const normalized = list.map(normalizeMetric)
  const max = opts?.maxResults ?? 1000
  return normalized.slice(0, max)
}

/**
 * 여러 키워드를 배치로 enrich — 1초에 3건 속도로 안전 호출.
 * 순수 입력 키워드의 메트릭만 반환 (연관어 확장 X).
 */
export async function enrichKeywordsSafely(
  keywords: string[],
  opts?: { batchSize?: number; delayMs?: number }
): Promise<Map<string, NormalizedKeywordMetric>> {
  const batchSize = opts?.batchSize ?? 5
  const delayMs = opts?.delayMs ?? 350 // 대략 초당 3건
  const result = new Map<string, NormalizedKeywordMetric>()

  for (let i = 0; i < keywords.length; i += batchSize) {
    const batch = keywords.slice(i, i + batchSize)
    try {
      const metrics = await fetchKeywordMetrics(batch)
      for (const kw of batch) {
        const match = metrics.find((m) => m.keyword === kw)
        if (match) result.set(kw, match)
      }
    } catch (err) {
      console.error(`[naver-ads] batch failed [${batch.join(", ")}]:`, err)
    }
    if (i + batchSize < keywords.length) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  return result
}
