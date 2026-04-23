import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const db = supabaseAdmin()
  const { data, error } = await db.from("drafts").select("*").eq("id", id).single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 })

  // topic / idea join
  let topic: Record<string, unknown> | null = null
  if (data.topic_id) {
    const { data: t } = await db
      .from("topics")
      .select("id, title, outline, primary_keyword, secondary_keywords, target_kpi, tone_guide, cta_hints, persona_id")
      .eq("id", data.topic_id)
      .maybeSingle()
    topic = t ?? null
  }
  return NextResponse.json({ ok: true, draft: { ...data, topic } })
}

const patchSchema = z.object({
  title: z.string().optional(),
  body_markdown: z.string().optional(),
  status: z.enum(["drafting", "reviewing", "approved", "published", "rewriting", "discarded"]).optional(),
  progress_pct: z.number().int().min(0).max(100).optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 })
  const db = supabaseAdmin()
  const { data, error } = await db.from("drafts").update(parsed.data).eq("id", id).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, draft: data })
}
