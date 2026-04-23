#!/usr/bin/env node
/**
 * 플라트 메타 기반 선별 키워드 65개를
 * 네이버 검색광고 API 로 enrich 한 뒤 Supabase research_sources 에 저장.
 *
 *   node scripts/seed-keywords.mjs
 */

import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import crypto from "node:crypto"
import pg from "pg"

// ── Env 수동 로드 (dotenv 없이) ───────────────────────────────
async function loadEnv() {
  const p = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".env.local")
  const t = await readFile(p, "utf8")
  for (const line of t.split("\n")) {
    const s = line.trim()
    if (!s || s.startsWith("#")) continue
    const eq = s.indexOf("=")
    if (eq < 0) continue
    const k = s.slice(0, eq).trim()
    const v = s.slice(eq + 1).trim()
    if (!process.env[k]) process.env[k] = v
  }
}

// ── Naver Ads 호출 ────────────────────────────────────────────
function sign(ts, method, uri, secret) {
  return crypto.createHmac("sha256", secret).update(`${ts}.${method}.${uri}`).digest("base64")
}

/** 네이버는 공백·특수문자 제거된 키워드를 기대. 매칭 시에도 동일 규칙. */
function canonical(k) {
  return k.replace(/\s+/g, "").toUpperCase()
}

async function fetchMetrics(keywords) {
  const uri = "/keywordstool"
  const ts = Date.now().toString()
  const secret = process.env.NAVER_AD_SECRET_KEY
  const headers = {
    "Content-Type": "application/json; charset=UTF-8",
    "X-Timestamp": ts,
    "X-API-KEY": process.env.NAVER_AD_API_KEY,
    "X-Customer": process.env.NAVER_AD_CUSTOMER_ID,
    "X-Signature": sign(ts, "GET", uri, secret),
  }
  const qs = new URLSearchParams({
    hintKeywords: keywords.map((k) => k.replace(/\s+/g, "")).join(","),
    showDetail: "1",
  })
  const res = await fetch(`https://api.naver.com${uri}?${qs}`, { method: "GET", headers })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Naver ${res.status}: ${body.slice(0, 200)}`)
  }
  const j = await res.json()
  return Array.isArray(j.keywordList) ? j.keywordList : []
}

function normCount(v) {
  if (v == null) return null
  if (typeof v === "number") return v
  if (typeof v === "string") {
    if (v.includes("<")) return 5
    const n = Number(v.replace(/[^0-9.]/g, ""))
    return Number.isFinite(n) ? n : null
  }
  return null
}
function normComp(v) {
  if (!v) return "unknown"
  if (v === "낮음") return "low"
  if (v === "중간") return "medium"
  if (v === "높음") return "high"
  return "unknown"
}

// ── Seed 리스트 (seed-keywords.ts 와 동일하지만 JS 로 복제) ────
const SEED = [
  // 지역
  ...[
    "강남 단기임대","홍대 단기임대","신촌 단기임대","건대 단기임대","이태원 단기임대",
    "성수 단기임대","잠실 단기임대","역삼 단기임대","합정 단기임대","망원 단기임대",
    "왕십리 단기임대","혜화 단기임대","안암 단기임대","서울 단기임대",
  ].map((k) => ({ keyword: k, category: "location" })),
  // 대학
  ...[
    "서울대 근처 원룸","연세대 근처 원룸","고려대 근처 원룸","성균관대 근처 원룸",
    "한양대 근처 원룸","경희대 근처 원룸","중앙대 근처 원룸","이화여대 근처 원룸",
    "서강대 근처 원룸","홍익대 근처 원룸","건국대 근처 원룸","한국외대 근처 원룸",
    "숙명여대 근처 원룸","카이스트 근처 원룸",
  ].map((k) => ({ keyword: k, category: "campus" })),
  // 타입
  ...[
    "레지던스 단기임대","오피스텔 단기임대","원룸 단기임대","투룸 단기임대",
    "서비스드아파트","주거형호텔","주거형 레지던스",
  ].map((k) => ({ keyword: k, category: "type" })),
  // 기간
  ...[
    "한달살기 레지던스","1주임대","중장기임대 레지던스","단기숙소","장기체류 할인","간편계약 레지던스",
  ].map((k) => ({ keyword: k, category: "duration" })),
  // 옵션
  ...[
    "풀옵션 원룸","가구완비 레지던스","주방있는 레지던스","무제한와이파이 레지던스",
    "주차가능 레지던스","홈오피스 단기임대","업무가능 레지던스",
  ].map((k) => ({ keyword: k, category: "option" })),
  // 상황
  ...[
    "보증금없는 단기임대","보증금 없는 월세","이사 단기임대","재택근무 단기임대",
    "인테리어 공사 단기임대","법인결제 가능한 레지던스","가족 레지던스","신혼부부 레지던스",
  ].map((k) => ({ keyword: k, category: "situation" })),
  // 외국인
  ...[
    "외국인 단기임대","외국인 월세","외국인 방 구하기","외국인 숙소 추천",
    "유학생 숙소","유학생 월세","교환학생 숙소","어학연수 숙소","유학생 방 구하기",
  ].map((k) => ({ keyword: k, category: "foreigner" })),
]

async function main() {
  await loadEnv()

  // Postgres
  const client = new pg.Client({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()

  // 기본 프로젝트
  const p = await client.query(
    "select id from projects order by created_at asc limit 1"
  )
  if (!p.rows[0]) throw new Error("no project found")
  const projectId = p.rows[0].id

  console.log(`🌱 seed ${SEED.length} keywords → Naver Ads enrich → DB`)
  console.log(`project: ${projectId}\n`)

  let ok = 0, fail = 0
  for (let i = 0; i < SEED.length; i += 5) {
    const batch = SEED.slice(i, i + 5)
    const kws = batch.map((s) => s.keyword)
    try {
      const metrics = await fetchMetrics(kws)
      for (const seed of batch) {
        const target = canonical(seed.keyword)
        const m = metrics.find((x) => canonical(x.relKeyword) === target)
        const pc = normCount(m?.monthlyPcQcCnt)
        const mo = normCount(m?.monthlyMobileQcCnt)
        const total = (pc ?? 0) + (mo ?? 0)
        const comp = normComp(m?.compIdx)

        // upsert
        await client.query(
          `insert into research_sources
             (project_id, kind, label, category, data, monthly_pc, monthly_mobile, monthly_total, competition, enriched_at, collected_at)
           values
             ($1, 'keyword', $2, $3, $4, $5, $6, $7, $8, now(), now())
           on conflict (project_id, kind, label)
           do update set
             category = excluded.category,
             data = excluded.data,
             monthly_pc = excluded.monthly_pc,
             monthly_mobile = excluded.monthly_mobile,
             monthly_total = excluded.monthly_total,
             competition = excluded.competition,
             enriched_at = excluded.enriched_at`,
          [
            projectId,
            seed.keyword,
            seed.category,
            JSON.stringify({ raw: m ?? null }),
            pc,
            mo,
            total || null,
            comp,
          ]
        )
        const totalStr = total ? total.toLocaleString() : "—"
        console.log(`  ✅ [${seed.category.padEnd(10)}] ${seed.keyword.padEnd(30)} pc=${pc ?? "—"} mo=${mo ?? "—"} total=${totalStr} comp=${comp}`)
        ok++
      }
    } catch (err) {
      console.error(`  ❌ batch [${kws.join(", ")}] → ${err.message}`)
      fail += batch.length
    }
    // rate limit 여유 (초당 3건 목표)
    if (i + 5 < SEED.length) await new Promise((r) => setTimeout(r, 400))
  }

  await client.end()
  console.log(`\n🎉 Done. ${ok} ok · ${fail} failed`)
}

main().catch((err) => {
  console.error("❌", err)
  process.exit(1)
})
