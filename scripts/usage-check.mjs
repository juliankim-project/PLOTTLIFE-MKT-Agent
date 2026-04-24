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

const summary = await c.query(`
  SELECT
    provider,
    model,
    count(*) as calls,
    sum(input_tokens) as in_tok,
    sum(output_tokens) as out_tok,
    sum(cost_usd) as cost
  FROM agent_runs
  WHERE status = 'succeeded'
  GROUP BY provider, model
  ORDER BY provider, model;
`)
console.log("=== 모델별 누적 호출 (모든 시점) ===")
for (const r of summary.rows) {
  console.log(`${r.provider}/${r.model}: ${r.calls}회 · in=${r.in_tok ?? 0} · out=${r.out_tok ?? 0} · $${r.cost ?? 0}`)
}

const last7 = await c.query(`
  SELECT
    count(*) as calls,
    sum(input_tokens) as in_tok,
    sum(output_tokens) as out_tok
  FROM agent_runs
  WHERE status = 'succeeded'
    AND provider = 'google'
    AND created_at >= now() - interval '7 days';
`)
const r7 = last7.rows[0]
console.log(`\n=== 최근 7일 Google/Vertex ===`)
console.log(`호출: ${r7.calls}회 · 입력 토큰: ${r7.in_tok ?? 0} · 출력 토큰: ${r7.out_tok ?? 0}`)

// Vertex 2.5 Flash 가격 기준 추정 (입력 $0.30/1M, 출력 $2.50/1M)
const estCost = (Number(r7.in_tok || 0) * 0.3 + Number(r7.out_tok || 0) * 2.5) / 1_000_000
console.log(`추정 비용 (Flash 단가 기준): $${estCost.toFixed(4)}`)

await c.end()
