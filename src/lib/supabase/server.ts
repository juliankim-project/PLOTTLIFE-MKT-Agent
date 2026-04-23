/**
 * Supabase — Server-only clients.
 *
 * ⚠️ 이 모듈은 절대 클라이언트 컴포넌트에서 import 되면 안 됨.
 *    서버 (Route Handlers / Server Components / Server Actions)에서만 사용.
 *    키가 번들에 노출되지 않도록 NEXT_PUBLIC_ prefix 없이 읽는다.
 */

import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = process.env.SUPABASE_URL
const anonKey = process.env.SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

function required(name: string, v: string | undefined): string {
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

/** Admin client — RLS 우회. service_role 사용. 서버 API에서 기본. */
export function supabaseAdmin(): SupabaseClient {
  return createClient(required("SUPABASE_URL", url), required("SUPABASE_SERVICE_ROLE_KEY", serviceKey), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Anon client — RLS 적용. 사용자별 접근 제어 쓸 때만. */
export function supabaseAnon(): SupabaseClient {
  return createClient(required("SUPABASE_URL", url), required("SUPABASE_ANON_KEY", anonKey), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** 헬스 체크 — 마이그레이션 적용 여부 확인용. */
export async function pingDb() {
  const db = supabaseAdmin()
  const { data, error } = await db.from("agents").select("id").limit(1)
  if (error) {
    // "relation does not exist" / "not found in schema cache" 등 → 마이그레이션 미적용
    return { ok: false as const, error: error.message, migrated: false }
  }
  const { count } = await db.from("agents").select("*", { count: "exact", head: true })
  return { ok: true as const, migrated: true, agents: count ?? data?.length ?? 0 }
}
