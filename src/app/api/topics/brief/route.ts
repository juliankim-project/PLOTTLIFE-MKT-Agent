import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/server"
import { generateAndStoreBrief } from "@/lib/ai/brief"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const bodySchema = z.object({
  ideaId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  targetKpi: z.enum(["conversion", "traffic", "dwell_time"]).optional(),
  quality: z.enum(["flash", "pro"]).optional(),
  forcedTemplate: z.enum(["steps", "compare", "story"]).optional(),
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
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 })
  }

  let projectId = parsed.data.projectId
  if (!projectId) {
    const db = supabaseAdmin()
    const { data } = await db
      .from("projects")
      .select("id")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle()
    if (!data) return NextResponse.json({ ok: false, error: "no project" }, { status: 500 })
    projectId = data.id
  }

  try {
    const result = await generateAndStoreBrief({
      projectId: projectId!,
      ideaId: parsed.data.ideaId,
      targetKpi: parsed.data.targetKpi,
      quality: parsed.data.quality,
      forcedTemplate: parsed.data.forcedTemplate,
    })
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
