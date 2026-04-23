"use client"

import { useSyncExternalStore } from "react"
import type { BlogContent } from "./schema"
import { MOCK_CONTENTS } from "./mock-contents"

/**
 * Reactive blog store
 * — useSyncExternalStore 기반, 페이지 간 변경 전파
 * — localStorage 영속화 (브라우저에서만)
 * — Phase 2에서 API/SQLite로 교체 시 이 파일만 교체하면 됨
 */

const STORAGE_KEY = "life-mkt-agent.blog.contents.v1"

function loadInitial(): BlogContent[] {
  if (typeof window === "undefined") return [...MOCK_CONTENTS]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...MOCK_CONTENTS]
    const parsed = JSON.parse(raw) as BlogContent[]
    if (!Array.isArray(parsed) || parsed.length === 0) return [...MOCK_CONTENTS]
    return parsed
  } catch {
    return [...MOCK_CONTENTS]
  }
}

let state: BlogContent[] = loadInitial()
const listeners = new Set<() => void>()

function emit() {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // storage quota 등 무시
    }
  }
  listeners.forEach((l) => l())
}

function subscribe(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot() {
  return state
}

function getServerSnapshot() {
  return MOCK_CONTENTS
}

// ── Public API ───────────────────────────────────────

export const blogStore = {
  subscribe,
  getSnapshot,

  list(): BlogContent[] {
    return state
  },

  find(id: string): BlogContent | undefined {
    return state.find((c) => c.id === id)
  },

  create(content: BlogContent) {
    state = [content, ...state]
    emit()
    return content
  },

  update(id: string, patch: Partial<BlogContent>) {
    state = state.map((c) =>
      c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString() } : c
    )
    emit()
  },

  publish(id: string) {
    const now = new Date().toISOString()
    state = state.map((c) =>
      c.id === id
        ? {
            ...c,
            status: "published" as const,
            published_at: now,
            updated_at: now,
          }
        : c
    )
    emit()
  },

  unpublish(id: string) {
    state = state.map((c) =>
      c.id === id
        ? {
            ...c,
            status: "reviewing" as const,
            updated_at: new Date().toISOString(),
          }
        : c
    )
    emit()
  },

  setStatus(id: string, status: BlogContent["status"]) {
    state = state.map((c) =>
      c.id === id ? { ...c, status, updated_at: new Date().toISOString() } : c
    )
    emit()
  },

  remove(id: string) {
    state = state.filter((c) => c.id !== id)
    emit()
  },

  reset() {
    state = [...MOCK_CONTENTS]
    emit()
  },
}

// ── React hook ───────────────────────────────────────

export function useBlogContents(): BlogContent[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

export function useBlogContent(id: string): BlogContent | undefined {
  const all = useBlogContents()
  return all.find((c) => c.id === id)
}

// ── Derived selectors ───────────────────────────────────────

export function sortByRecent(list: BlogContent[]) {
  return [...list].sort((a, b) =>
    (b.scheduled_at ?? b.updated_at).localeCompare(a.scheduled_at ?? a.updated_at)
  )
}

export function topPerformers(list: BlogContent[]) {
  const published = list.filter((c) => c.status === "published" && c.metrics)
  if (published.length === 0) return []
  const sorted = [...published].sort(
    (a, b) => (b.metrics?.page_views ?? 0) - (a.metrics?.page_views ?? 0)
  )
  return sorted.slice(0, Math.ceil(sorted.length * 0.3))
}

export function lowPerformers(list: BlogContent[]) {
  const published = list.filter((c) => c.status === "published" && c.metrics)
  if (published.length === 0) return []
  const sorted = [...published].sort(
    (a, b) => (a.metrics?.page_views ?? 0) - (b.metrics?.page_views ?? 0)
  )
  return sorted.slice(0, Math.ceil(sorted.length * 0.3))
}
