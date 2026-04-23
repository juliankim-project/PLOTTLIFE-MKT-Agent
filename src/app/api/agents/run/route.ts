import { NextResponse } from "next/server"
import { z } from "zod"
import { runAgent } from "@/lib/ai/agents"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const bodySchema = z.object({
  agentSlug: z.string().min(1),
  prompt: z.string().min(1),
  context: z.string().optional(),
  stage: z.enum(["research", "ideation", "topic", "write", "review", "publish", "analyze"]).optional(),
  projectId: z.string().uuid().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().positive().max(16000).optional(),
  json: z.boolean().optional(),
  providerOverride: z.enum(["anthropic", "openai", "google"]).optional(),
  modelOverride: z.string().optional(),
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
  try {
    const result = await runAgent(parsed.data)
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
