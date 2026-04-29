/**
 * DAB Admin API 클라이언트 — 콘텐츠 자동 등록.
 *
 * 동작 모드:
 *  1) MOCK (디폴트, 인증 추적 전)
 *     - 환경변수 DAB_API_URL 미설정 또는 DAB_USE_MOCK=true 일 때
 *     - 실제 API 호출 X, 가짜 dab_blog_id 발급해서 흐름만 검증
 *  2) REAL (인증 추적 후)
 *     - DAB_API_URL + DAB_API_TOKEN 설정 시
 *     - POST /v1/blog 실제 호출 (Authorization: Bearer <token>)
 *
 * 호출 측은 모드와 무관 — saveBlogToAdmin() 결과만 보고 metadata 업데이트.
 */

import "server-only"
import { mapDraftToDabInput, readDabBlogIdFromMetadata, type DabSaveBlogInput, type DraftLike, type TopicLike } from "./mapping"
import type { DabCategory } from "./category"

export interface DabSaveSuccess {
  ok: true
  mode: "mock" | "real"
  dabBlogId: number
  dabStatus: "DRAFT" | "PUBLISHED"
  dabCategory: DabCategory
  registeredAt: string
}

export interface DabSaveFailure {
  ok: false
  error: string
}

export type DabSaveResult = DabSaveSuccess | DabSaveFailure

export interface SaveBlogInput {
  draft: DraftLike & { metadata?: Record<string, unknown> | null }
  topic?: TopicLike | null
  category: DabCategory
  status: "DRAFT" | "PUBLISHED"
  authorName?: string
}

const apiUrl = () => process.env.DAB_API_URL?.replace(/\/$/, "") ?? ""
const apiToken = () => process.env.DAB_API_TOKEN ?? ""
const isMockMode = () => !apiUrl() || process.env.DAB_USE_MOCK === "true"

export async function saveBlogToAdmin(input: SaveBlogInput): Promise<DabSaveResult> {
  const dabInput = mapDraftToDabInput(input.draft, input.topic ?? null, {
    existingDabId: readDabBlogIdFromMetadata(input.draft.metadata),
    forcedCategory: input.category,
    status: input.status,
    authorName: input.authorName,
  })

  if (isMockMode()) {
    return mockSave(dabInput)
  }

  return realSave(dabInput)
}

/* ─── MOCK ─────────────────────────────────────────────── */

async function mockSave(input: DabSaveBlogInput): Promise<DabSaveResult> {
  /* 0.6~1.2초 지연으로 실제 호출 느낌 시뮬레이션 */
  await new Promise((r) => setTimeout(r, 600 + Math.random() * 600))

  /* 기존 ID 가 있으면 update 시뮬레이션 — 같은 ID 유지. 없으면 새 ID. */
  const dabBlogId = input.id ?? generateMockId()
  console.log(
    `[dab:mock] ${input.id ? "UPDATE" : "INSERT"} blog id=${dabBlogId} status=${input.status} category=${input.category} content=${input.content?.length ?? 0}b`
  )

  return {
    ok: true,
    mode: "mock",
    dabBlogId,
    dabStatus: input.status,
    dabCategory: input.category,
    registeredAt: new Date().toISOString(),
  }
}

/* timestamp 기반 6자리 mock id (충돌 거의 없음) */
function generateMockId(): number {
  return Math.floor(Date.now() / 1000) % 1_000_000
}

/* ─── REAL (인증 추적 후 활성화) ───────────────────────── */

async function realSave(input: DabSaveBlogInput): Promise<DabSaveResult> {
  const url = `${apiUrl()}/v1/blog`
  const token = apiToken()
  if (!token) {
    return { ok: false, error: "DAB_API_TOKEN 미설정 — 인증 토큰 필요" }
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, error: `${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}` }
    }

    /* 대브 schema 의 BlogItemResponse 형태 가정 */
    const data = (await res.json()) as { id?: number; status?: "DRAFT" | "PUBLISHED" }
    if (typeof data.id !== "number") {
      return { ok: false, error: "응답에 id 가 없음" }
    }

    return {
      ok: true,
      mode: "real",
      dabBlogId: data.id,
      dabStatus: data.status ?? input.status,
      dabCategory: input.category,
      registeredAt: new Date().toISOString(),
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
