/**
 * DAB Admin API 클라이언트 — 콘텐츠 자동 등록.
 *
 * 동작 모드:
 *  1) MOCK (디폴트)
 *     - 환경변수 DAB_API_URL / CLIENT_ID / CLIENT_SECRET 미설정 또는
 *       DAB_USE_MOCK=true 일 때
 *     - 실제 API 호출 X, 가짜 dab_blog_id 발급해서 흐름만 검증
 *  2) REAL
 *     - 환경변수 3종 모두 설정 시:
 *       · DAB_API_URL (예: https://dev.life.plott.co.kr/api)
 *       · DAB_CLIENT_ID (예: marketing-agent)
 *       · DAB_CLIENT_SECRET (벤틀리 발급)
 *     - POST /v1/blog 호출 (Authorization: Basic ${base64(id:secret)})
 *
 * ⚠ 보안: secret 은 process.env 에서만 읽음. 응답·로그에 절대 노출 X.
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
const clientId = () => process.env.DAB_CLIENT_ID ?? ""
const clientSecret = () => process.env.DAB_CLIENT_SECRET ?? ""
const isMockMode = () =>
  process.env.DAB_USE_MOCK === "true" ||
  !apiUrl() || !clientId() || !clientSecret()

/** Basic Auth 헤더 생성 — Buffer.from base64 encode */
function buildBasicAuth(): string {
  const id = clientId()
  const secret = clientSecret()
  /* Node.js / Edge 양쪽 호환 */
  const raw = `${id}:${secret}`
  const encoded =
    typeof Buffer !== "undefined"
      ? Buffer.from(raw, "utf-8").toString("base64")
      : btoa(unescape(encodeURIComponent(raw)))
  return `Basic ${encoded}`
}

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

/* ─── REAL (Basic Auth) ──────────────────────────────────
   POST {DAB_API_URL}/v1/blog
   Authorization: Basic ${base64(clientId:clientSecret)}

   ⚠ 보안:
   - secret 은 process.env 에서만 읽음
   - 에러 메시지에 헤더·secret 절대 포함 X
   - 로그에 secret 출력 금지 */
async function realSave(input: DabSaveBlogInput): Promise<DabSaveResult> {
  const url = `${apiUrl()}/v1/blog`

  if (!clientId() || !clientSecret()) {
    return { ok: false, error: "DAB_CLIENT_ID / DAB_CLIENT_SECRET 미설정" }
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: buildBasicAuth(),
      },
      body: JSON.stringify(input),
    })

    if (!res.ok) {
      /* 응답 텍스트만 — 우리 헤더(Authorization 포함) 는 절대 외부로 안 나감 */
      const text = await res.text().catch(() => "")
      return {
        ok: false,
        error: `${res.status} ${res.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`,
      }
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
    /* 네트워크 등 에러 메시지 — secret 미포함 */
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
