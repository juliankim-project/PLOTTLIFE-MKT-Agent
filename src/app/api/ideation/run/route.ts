import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/server"
import { generateAndStoreIdeas } from "@/lib/ai/ideation"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60 // Vercel 서버리스 timeout

const bodySchema = z.object({
  projectId: z.string().uuid().optional(),
  personaSlug: z.string().optional(),
  personaLabel: z.string().optional(),
  count: z.number().int().min(5).max(50).optional(),
  temperature: z.number().min(0).max(2).optional(),
  researchContext: z.string().max(4000).optional(),
})

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json body" }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid body", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  // projectId 없으면 기본 프로젝트 자동 선택
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
      return NextResponse.json(
        { ok: false, error: "no project exists; run migration seed first" },
        { status: 500 }
      )
    }
    projectId = data.id
  }

  try {
    const result = await generateAndStoreIdeas({
      ...parsed.data,
      projectId: projectId!,
    })
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
