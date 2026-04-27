/**
 * 가벼운 localStorage 캐시 — 재방문 시 즉시 렌더 + 백그라운드 갱신.
 * SWR 패턴 미니버전.
 */

const PREFIX = "plott-blog-cache:"
const MAX_AGE_MS = 5 * 60 * 1000 // 5분

interface Cached<T> {
  ts: number
  data: T
}

export function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Cached<T>
    if (!parsed?.ts) return null
    if (Date.now() - parsed.ts > MAX_AGE_MS) return null
    return parsed.data ?? null
  } catch {
    return null
  }
}

export function writeCache<T>(key: string, data: T): void {
  if (typeof window === "undefined") return
  try {
    const payload: Cached<T> = { ts: Date.now(), data }
    window.localStorage.setItem(PREFIX + key, JSON.stringify(payload))
  } catch {
    /* QuotaExceeded 등 무시 */
  }
}

export function clearCache(key: string): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}
