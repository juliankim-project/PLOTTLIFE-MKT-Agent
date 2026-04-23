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
  const { data, error } = await db
    .from("topics")
    .select("*")
    .eq("id", id)
    .single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 404 })

  // persona 라벨 join
  let personaLabel: string | null = null
  if (data.persona_id) {
    const { data: p } = await db
      .from("personas")
      .select("label")
      .eq("id", data.persona_id)
      .maybeSingle()
    personaLabel = p?.label ?? null
  }

  // idea 원문 join
  let idea: { id: string; title: string; cluster: string | null; rationale: string | null } | null = null
  if (data.idea_id) {
    const { data: i } = await db
      .from("ideas")
      .select("id, title, cluster, rationale")
      .eq("id", data.idea_id)
      .maybeSingle()
    idea = i ?? null
  }

  return NextResponse.json({ ok: true, topic: { ...data, persona_label: personaLabel, idea } })
}

const patchSchema = z.object({
  title: z.string().optional(),
  primary_keyword: z.string().optional(),
  secondary_keywords: z.array(z.string()).optional(),
  target_kpi: z.enum(["conversion", "traffic", "dwell_time"]).optional(),
  tone_guide: z.string().optional(),
  outline: z.array(z.any()).optional(),
  cta_hints: z.array(z.string()).optional(),
  status: z.enum(["draft", "approved", "archived"]).optional(),
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
  const patch: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.status === "approved") {
    patch.finalized_at = new Date().toISOString()
  }
  const { data, error } = await db.from("topics").update(patch).eq("id", id).select().single()
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, topic: data })
}
