import { NextResponse } from "next/server"
import { z } from "zod"
import { generateMarketInsights } from "@/lib/research/insights"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const bodySchema = z.object({
  category: z.string().max(60).optional(),
  topKeywords: z.array(z.string().max(80)).max(10).optional(),
  scope: z.string().max(120).optional(),
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
    return NextResponse.json(
      { ok: false, error: "invalid body", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  try {
    const insights = await generateMarketInsights(parsed.data)
    return NextResponse.json({ ok: true, insights })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
