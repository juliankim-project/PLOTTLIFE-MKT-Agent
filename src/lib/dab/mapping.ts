/**
 * Drafts → 대브 어드민 SaveBlogInput 매핑.
 *
 * 대브 schema (apps/admin/.../julian/blog/schemas.ts) 의 SaveBlogInput 1:1 매핑.
 * 자동화 발행 시 사용됨. 게시 토글은 디폴트 OFF (status: "DRAFT").
 */

import { pickDabCategory, type DabCategory } from "./category"
import { markdownToHtml, extractSummary } from "./markdown-to-html"

/* 대브 SaveBlogInput 과 1:1 미러링한 타입 */
export interface DabSaveBlogInput {
  id: number | null
  title: string
  category: DabCategory
  thumbnail: string | null
  summary: string | null
  content: string | null
  authorName: string
  isLifeEditor: boolean
  status: "DRAFT" | "PUBLISHED"
  layoutType?: "A" | "B"
  isFeatured: boolean
  sortOrder: number
  showRelated: boolean
  relatedIds: string[]
  imgSettingsA?: { scale: number; x: number; y: number } | null
  imgSettingsB?: { scale: number; x: number; y: number } | null
}

const DEFAULT_IMG_SETTINGS = { scale: 1, x: 0, y: 0 }

/** drafts row + topic row 입력 */
export interface DraftLike {
  title: string
  body_markdown: string | null
  cover_url?: string | null
  meta_description?: string | null
  primary_keyword?: string | null
  secondary_keywords?: string[] | null
  metadata?: Record<string, unknown> | null
}
export interface TopicLike {
  journey_stage?: string | null
  primary_keyword?: string | null
  secondary_keywords?: string[] | null
}

export interface MapDraftOptions {
  /** 기존 대브 blog id (수정 시) — drafts.metadata.dab_blog_id 에서 읽어 전달 */
  existingDabId?: number | null
  /** 작성자명. 환경변수 DAB_AUTHOR_NAME 또는 "플라트라이프 에디터" */
  authorName?: string
  /** 발행 토글 — 디폴트 DRAFT (게시 OFF) */
  status?: "DRAFT" | "PUBLISHED"
  /** 카테고리 강제 지정 (자동 매핑 무시) */
  forcedCategory?: DabCategory
  /** 썸네일 URL 강제 지정 */
  forcedThumbnail?: string | null
  /** Featured 토글 */
  isFeatured?: boolean
  /** 정렬 순서 */
  sortOrder?: number
}

/**
 * drafts row 를 대브 어드민의 SaveBlogInput 으로 변환.
 * - category: 자동 매핑 (forcedCategory 가 있으면 우선)
 * - content: markdown → HTML
 * - summary: 본문 도입부 자동 추출 (drafts.meta_description 우선)
 * - thumbnail: cover_url (forcedThumbnail 우선)
 * - status: 디폴트 "DRAFT" — 게시 토글 OFF
 */
export function mapDraftToDabInput(
  draft: DraftLike,
  topic: TopicLike | null,
  options: MapDraftOptions = {}
): DabSaveBlogInput {
  const category =
    options.forcedCategory ??
    pickDabCategory({
      title: draft.title,
      primaryKeyword: draft.primary_keyword ?? topic?.primary_keyword,
      secondaryKeywords: draft.secondary_keywords ?? topic?.secondary_keywords,
      journeyStage: topic?.journey_stage,
    })

  const html = markdownToHtml(draft.body_markdown ?? "")
  const summary = draft.meta_description?.trim() || extractSummary(draft.body_markdown ?? "")
  const thumbnail = options.forcedThumbnail ?? draft.cover_url ?? null

  return {
    id: options.existingDabId ?? null,
    title: draft.title,
    category,
    thumbnail,
    summary: summary || null,
    content: html || null,
    authorName: options.authorName ?? "플라트라이프 에디터",
    isLifeEditor: true,
    status: options.status ?? "DRAFT",
    layoutType: "A",
    isFeatured: options.isFeatured ?? false,
    sortOrder: options.sortOrder ?? 0,
    showRelated: false,
    relatedIds: [],
    imgSettingsA: DEFAULT_IMG_SETTINGS,
    imgSettingsB: DEFAULT_IMG_SETTINGS,
  }
}

/** drafts.metadata 에서 기존 대브 blog id 추출 (양방향 ID 매칭용) */
export function readDabBlogIdFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): number | null {
  if (!metadata) return null
  const v = (metadata as { dab_blog_id?: unknown }).dab_blog_id
  return typeof v === "number" && Number.isFinite(v) ? v : null
}
