import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/server"
import { writeAndStoreDraft } from "@/lib/ai/writer"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const bodySchema = z.object({
  topicId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  quality: z.enum(["flash", "pro"]).optional(),
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
    const result = await writeAndStoreDraft({
      projectId: projectId!,
      topicId: parsed.data.topicId,
      quality: parsed.data.quality,
    })
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
