import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/server"
import { runFullPipelineFromIdea } from "@/lib/ai/automation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const bodySchema = z.object({
  projectId: z.string().uuid().optional(),
  ideaId: z.string().uuid().optional(),
  forcedTemplate: z.enum(["steps", "compare", "story"]).optional(),
  quality: z.enum(["flash", "pro"]).optional(),
})

export async function POST(req: Request) {
  let body: unknown = {}
  try {
    body = await req.json()
  } catch {
    /* 빈 body 허용 — 자동 선택 */
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid body", issues: parsed.error.issues },
      { status: 400 }
    )
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
    if (!data) {
      return NextResponse.json({ ok: false, error: "no project" }, { status: 500 })
    }
    projectId = data.id
  }

  const result = await runFullPipelineFromIdea({
    projectId: projectId!,
    ideaId: parsed.data.ideaId,
    forcedTemplate: parsed.data.forcedTemplate,
    quality: parsed.data.quality,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, result }, { status: 502 })
  }
  return NextResponse.json({ ok: true, result })
}
