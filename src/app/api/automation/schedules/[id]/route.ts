import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/server"
import { nextRunFromCron, validateCron } from "@/lib/automation/schedule"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  cronExpression: z.string().min(1).max(120).optional(),
  enabled: z.boolean().optional(),
  forcedTemplate: z.enum(["steps", "compare", "story"]).nullable().optional(),
  quality: z.enum(["flash", "pro"]).optional(),
})

/** PATCH — 부분 수정 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid body", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (parsed.data.name !== undefined) patch.name = parsed.data.name
  if (parsed.data.enabled !== undefined) patch.enabled = parsed.data.enabled
  if (parsed.data.forcedTemplate !== undefined) patch.forced_template = parsed.data.forcedTemplate
  if (parsed.data.quality !== undefined) patch.quality = parsed.data.quality

  /* cron 변경 시 검증 + next_run_at 재계산 */
  if (parsed.data.cronExpression !== undefined) {
    try {
      validateCron(parsed.data.cronExpression)
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: `invalid cron: ${err instanceof Error ? err.message : "parse error"}` },
        { status: 400 }
      )
    }
    patch.cron_expression = parsed.data.cronExpression
    patch.next_run_at = nextRunFromCron(parsed.data.cronExpression).toISOString()
  }

  const db = supabaseAdmin()
  const { data, error } = await db
    .from("automation_schedules")
    .update(patch)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, schedule: data })
}

/** DELETE — schedule 삭제 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const db = supabaseAdmin()
  const { error } = await db.from("automation_schedules").delete().eq("id", id)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
