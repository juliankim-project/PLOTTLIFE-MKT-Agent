import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/server"
import { saveBlogToAdmin } from "@/lib/dab/client"
import { DAB_CATEGORIES } from "@/lib/dab/category"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 30

const bodySchema = z.object({
  draftId: z.string().uuid(),
  category: z.enum(DAB_CATEGORIES),
  status: z.enum(["DRAFT", "PUBLISHED"]),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid body", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const { draftId, category, status } = parsed.data
  const db = supabaseAdmin()

  /* drafts 조회 */
  const { data: draft, error: draftErr } = await db
    .from("drafts")
    .select(
      "id, title, body_markdown, hero_image_url, primary_keyword, secondary_keywords, metadata, topic_id"
    )
    .eq("id", draftId)
    .single()
  if (draftErr || !draft) {
    return NextResponse.json({ ok: false, error: `draft not found: ${draftErr?.message}` }, { status: 404 })
  }
  if (!draft.body_markdown || draft.body_markdown.length < 200) {
    return NextResponse.json(
      { ok: false, error: "본문이 비어있거나 너무 짧아 발행할 수 없어요 (200자 이상 필요)" },
      { status: 400 }
    )
  }

  /* topic 조회 (선택) */
  let topic: { journey_stage?: string | null } | null = null
  if (draft.topic_id) {
    const { data } = await db
      .from("topics")
      .select("journey_stage")
      .eq("id", draft.topic_id)
      .maybeSingle()
    topic = data ?? null
  }

  /* DAB 어드민 등록 */
  const result = await saveBlogToAdmin({
    draft: {
      title: draft.title,
      body_markdown: draft.body_markdown,
      cover_url: draft.hero_image_url,
      primary_keyword: draft.primary_keyword,
      secondary_keywords: draft.secondary_keywords,
      metadata: draft.metadata,
    },
    topic,
    category,
    status,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 })
  }

  /* drafts.metadata 업데이트 — 양방향 ID 매칭 + 상태 보존 */
  const nextMetadata = {
    ...(draft.metadata as Record<string, unknown> | null),
    dab_blog_id: result.dabBlogId,
    dab_status: result.dabStatus,
    dab_category: result.dabCategory,
    dab_registered_at: result.registeredAt,
    dab_mode: result.mode,
  }
  const { error: updErr } = await db
    .from("drafts")
    .update({ metadata: nextMetadata })
    .eq("id", draftId)
  if (updErr) {
    return NextResponse.json(
      { ok: false, error: `metadata 업데이트 실패: ${updErr.message}` },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, result, metadata: nextMetadata })
}
