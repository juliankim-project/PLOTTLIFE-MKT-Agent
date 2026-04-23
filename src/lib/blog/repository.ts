import type { BlogContent } from "./schema"
import { MOCK_CONTENTS } from "./mock-contents"

/**
 * Phase 1: 인메모리 저장소
 * — 클라이언트 측 useState와 결합해서 사용
 * — 새로고침하면 Mock 데이터로 리셋
 * — Phase 2에서 SQLite/API로 교체
 */

let contents: BlogContent[] = [...MOCK_CONTENTS]

export const BlogRepo = {
  list(): BlogContent[] {
    return [...contents].sort((a, b) =>
      (b.scheduled_at ?? b.updated_at).localeCompare(a.scheduled_at ?? a.updated_at)
    )
  },

  findById(id: string): BlogContent | undefined {
    return contents.find((c) => c.id === id)
  },

  create(content: BlogContent): BlogContent {
    contents.push(content)
    return content
  },

  update(id: string, patch: Partial<BlogContent>): BlogContent | undefined {
    const idx = contents.findIndex((c) => c.id === id)
    if (idx === -1) return undefined
    contents[idx] = { ...contents[idx], ...patch, updated_at: new Date().toISOString() }
    return contents[idx]
  },

  remove(id: string): boolean {
    const before = contents.length
    contents = contents.filter((c) => c.id !== id)
    return contents.length < before
  },

  byKPI(kpi: "conversion" | "traffic" | "dwell_time"): BlogContent[] {
    return contents.filter((c) => c.target_kpi === kpi)
  },

  byStatus(status: BlogContent["status"]): BlogContent[] {
    return contents.filter((c) => c.status === status)
  },

  // 저성과 콘텐츠 (리라이트 후보) - 발행됐고 조회수 하위 30%
  lowPerformers(): BlogContent[] {
    const published = contents.filter(
      (c) => c.status === "published" && c.metrics
    )
    if (published.length === 0) return []
    const sorted = [...published].sort(
      (a, b) => (a.metrics?.page_views ?? 0) - (b.metrics?.page_views ?? 0)
    )
    return sorted.slice(0, Math.ceil(sorted.length * 0.3))
  },

  // 고성과 콘텐츠 (패턴 학습용) - 발행됐고 조회수 상위 30%
  topPerformers(): BlogContent[] {
    const published = contents.filter(
      (c) => c.status === "published" && c.metrics
    )
    if (published.length === 0) return []
    const sorted = [...published].sort(
      (a, b) => (b.metrics?.page_views ?? 0) - (a.metrics?.page_views ?? 0)
    )
    return sorted.slice(0, Math.ceil(sorted.length * 0.3))
  },
}
