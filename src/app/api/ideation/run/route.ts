import { NextResponse } from "next/server"
import { z } from "zod"
import { supabaseAdmin } from "@/lib/supabase/server"
import { generateAndStoreIdeas } from "@/lib/ai/ideation"
import { INTENTS, JOURNEY_STAGES } from "@/lib/ideation/compass"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const bodySchema = z.object({
  projectId: z.string().uuid().optional(),
  /* 3축 Compass */
  intents: z.array(z.enum(INTENTS)).optional(),
  segmentSlugs: z.array(z.string()).max(8).optional(),
  journeyStages: z.array(z.enum(JOURNEY_STAGES)).optional(),
  seasons: z.array(z.string()).max(12).optional(),
  lifeTriggers: z.array(z.string()).max(12).optional(),
  painTags: z.array(z.string()).max(12).optional(),
  /* 자연어/키워드 검색 */
  searchQuery: z.string().max(500).optional(),
  searchMode: z.enum(["sentence", "keyword"]).optional(),
  /* 공통 */
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
