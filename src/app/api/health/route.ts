import { NextResponse } from "next/server"
import { pingDb } from "@/lib/supabase/server"
import { availableProviders } from "@/lib/ai/provider"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const result: {
    ok: boolean
    db: { ok: boolean; migrated?: boolean; agents?: number; error?: string }
    ai: Record<string, boolean>
    env: { node: string; nextPublicUrl: string | null; supabaseConfigured: boolean }
  } = {
    ok: true,
    db: { ok: false },
    ai: availableProviders(),
    env: {
      node: process.version,
      nextPublicUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
      supabaseConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
  }

  try {
    const db = await pingDb()
    result.db = db
    if (!db.ok) result.ok = false
  } catch (err) {
    result.db = { ok: false, error: err instanceof Error ? err.message : String(err) }
    result.ok = false
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 503 })
}
