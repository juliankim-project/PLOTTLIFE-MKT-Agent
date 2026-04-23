import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const db = supabaseAdmin()
  const { data, error } = await db
    .from("agents")
    .select("id, slug, display_name, role, provider, model, icon, color, is_active, config")
    .order("display_name")
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, agents: data ?? [] })
}
