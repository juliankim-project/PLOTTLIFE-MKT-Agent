import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/server"
import { rewriteDraftWithReview } from "@/lib/ai/writer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 120

const bodySchema = z.object({
  extraNote: z.string().max(1000).optional(),
  quality: z.enum(["flash", "pro"]).optional(),
})

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    /* body 비어있어도 허용 — 검수 피드백만 반영 */
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid body", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  /* projectId 자동 결정 */
  const db = supabaseAdmin()
  const { data: draft } = await db
    .from("drafts")
    .select("project_id")
    .eq("id", id)
    .maybeSingle()
  if (!draft) {
    return NextResponse.json({ ok: false, error: "draft not found" }, { status: 404 })
  }

  try {
    const result = await rewriteDraftWithReview({
      projectId: draft.project_id,
      draftId: id,
      extraNote: parsed.data.extraNote,
      quality: parsed.data.quality,
    })
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
