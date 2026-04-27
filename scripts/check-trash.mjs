#!/usr/bin/env node
import { readFileSync } from "fs"
import { resolve } from "path"
import pg from "pg"

const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8")
for (const line of env.split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
}

const { Client } = pg
const c = new Client({
  host: process.env.PGHOST, port: Number(process.env.PGPORT),
  user: process.env.PGUSER, password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE, ssl: { rejectUnauthorized: false },
})
await c.connect()

console.log("=== drafts status 분포 ===")
const r1 = await c.query(`SELECT status, count(*) FROM drafts GROUP BY status ORDER BY status;`)
for (const r of r1.rows) console.log(`  ${r.status}: ${r.count}`)

console.log("\n=== 최근 discarded drafts ===")
const r2 = await c.query(`
  SELECT id, status, substring(title, 1, 50) as title, updated_at
  FROM drafts WHERE status = 'discarded' ORDER BY updated_at DESC LIMIT 10;
`)
for (const r of r2.rows) console.log(`  ${r.id} · ${r.title} · ${r.updated_at}`)

console.log("\n=== topics 컬럼 확인 ===")
const r3 = await c.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'topics'
  ORDER BY ordinal_position;
`)
for (const r of r3.rows) console.log(`  ${r.column_name}: ${r.data_type}`)

await c.end()
