import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/server"
import { nextRunFromCron, validateCron } from "@/lib/automation/schedule"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const createSchema = z.object({
  projectId: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  cronExpression: z.string().min(1).max(120),
  enabled: z.boolean().optional(),
  forcedTemplate: z.enum(["steps", "compare", "story"]).nullable().optional(),
  quality: z.enum(["flash", "pro"]).optional(),
})

/** GET — 프로젝트의 schedule 목록 */
export async function GET(req: Request) {
  const url = new URL(req.url)
  const db = supabaseAdmin()

  let projectId = url.searchParams.get("projectId")
  if (!projectId) {
    const { data } = await db.from("projects").select("id").order("created_at").limit(1).maybeSingle()
    if (!data) return NextResponse.json({ ok: false, error: "no project" }, { status: 500 })
    projectId = data.id
  }

  const { data, error } = await db
    .from("automation_schedules")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, schedules: data ?? [] })
}

/** POST — 새 schedule 생성 */
export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid body", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  /* cron 검증 */
  try {
    validateCron(parsed.data.cronExpression)
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `invalid cron: ${err instanceof Error ? err.message : "parse error"}` },
      { status: 400 }
    )
  }

  const db = supabaseAdmin()
  let projectId = parsed.data.projectId
  if (!projectId) {
    const { data } = await db.from("projects").select("id").order("created_at").limit(1).maybeSingle()
    if (!data) return NextResponse.json({ ok: false, error: "no project" }, { status: 500 })
    projectId = data.id
  }

  const nextRunAt = nextRunFromCron(parsed.data.cronExpression).toISOString()

  const { data, error } = await db
    .from("automation_schedules")
    .insert({
      project_id: projectId,
      name: parsed.data.name,
      cron_expression: parsed.data.cronExpression,
      enabled: parsed.data.enabled ?? true,
      forced_template: parsed.data.forcedTemplate ?? null,
      quality: parsed.data.quality ?? "flash",
      next_run_at: nextRunAt,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, schedule: data })
}
