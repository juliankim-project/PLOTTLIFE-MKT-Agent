#!/usr/bin/env node
/**
 * DB 마이그레이션 러너.
 *   supabase/migrations/*.sql 파일을 순서대로 실행한다.
 *   .env.local 의 PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE 사용.
 *
 *   사용:  node scripts/db-migrate.mjs
 *          node scripts/db-migrate.mjs supabase/migrations/_bootstrap.sql
 */

import { readFile, readdir } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import "dotenv/config"

// .env.local 을 수동 로드 (dotenv/config는 .env만 읽음)
async function loadEnvLocal() {
  const envPath = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local")
  try {
    const text = await readFile(envPath, "utf8")
    for (const line of text.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq === -1) continue
      const k = trimmed.slice(0, eq).trim()
      const v = trimmed.slice(eq + 1).trim()
      if (!process.env[k]) process.env[k] = v
    }
  } catch (e) {
    console.error("⚠️  .env.local 읽기 실패:", e.message)
  }
}

async function resolveTargets(argv) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
  if (argv.length) {
    return argv.map((p) => resolve(root, p))
  }
  const dir = resolve(root, "supabase/migrations")
  const files = (await readdir(dir))
    .filter((f) => f.endsWith(".sql") && !f.startsWith("_")) // _bootstrap.sql 은 skip (0001+0002 조합)
    .sort()
  return files.map((f) => join(dir, f))
}

async function main() {
  await loadEnvLocal()
  const targets = await resolveTargets(process.argv.slice(2))
  if (!targets.length) {
    console.error("❌ 실행할 SQL 파일이 없습니다.")
    process.exit(1)
  }

  const required = ["PGHOST", "PGPORT", "PGUSER", "PGPASSWORD", "PGDATABASE"]
  for (const k of required) {
    if (!process.env[k]) {
      console.error(`❌ 누락된 env: ${k}`)
      process.exit(1)
    }
  }

  const client = new pg.Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: { rejectUnauthorized: false },
  })

  console.log(`🔌 Connecting to ${process.env.PGHOST}:${process.env.PGPORT} as ${process.env.PGUSER}...`)
  await client.connect()
  console.log("✅ Connected.\n")

  for (const file of targets) {
    const label = file.replace(resolve(".") + "/", "")
    console.log(`▶︎  ${label}`)
    const sql = await readFile(file, "utf8")
    const started = Date.now()
    try {
      await client.query(sql)
      console.log(`   ✅ ok (${Date.now() - started}ms)\n`)
    } catch (err) {
      console.error(`   ❌ 실패: ${err.message}`)
      await client.end()
      process.exit(1)
    }
  }

  // 최종 확인
  const { rows } = await client.query("select count(*)::int as n from agents")
  console.log(`\n📊 agents row count: ${rows[0].n}`)
  const { rows: tbls } = await client.query(
    "select tablename from pg_tables where schemaname='public' order by tablename"
  )
  console.log(`📦 public tables: ${tbls.map((r) => r.tablename).join(", ")}`)

  await client.end()
  console.log("\n🎉 Migration complete.")
}

main().catch((err) => {
  console.error("❌ FAILED:", err)
  process.exit(1)
})
