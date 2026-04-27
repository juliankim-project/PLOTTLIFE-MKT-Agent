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

const r = await c.query(`
  SELECT
    id, status, model, duration_ms, input_tokens, output_tokens,
    error,
    substring((output->>'text')::text, 1, 400) as text_preview,
    substring((output->>'text')::text, greatest(1, length(output->>'text') - 300)) as text_tail,
    length(output->>'text') as text_len
  FROM agent_runs
  WHERE stage = 'review'
  ORDER BY created_at DESC
  LIMIT 3;
`)
for (const row of r.rows) {
  console.log(`\n=== ${row.id} · ${row.status} · ${row.model} · ${row.duration_ms}ms ===`)
  console.log(`tokens: in=${row.input_tokens}, out=${row.output_tokens}, text_len=${row.text_len}`)
  if (row.error) console.log(`error: ${row.error}`)
  if (row.text_preview) {
    console.log(`\n--- TEXT HEAD ---\n${row.text_preview}`)
    console.log(`\n--- TEXT TAIL ---\n${row.text_tail}`)
  }
}

await c.end()
