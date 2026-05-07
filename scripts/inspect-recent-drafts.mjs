import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
config({ path: ".env.local" })

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error("missing env"); process.exit(1) }
const db = createClient(url, key)

const { data, error } = await db
  .from("drafts")
  .select("id, title, body_markdown, created_at, status, metadata")
  .order("created_at", { ascending: false })
  .limit(5)

if (error) { console.error(error); process.exit(1) }

for (const d of data) {
  const md = d.body_markdown ?? ""
  const noWs = md.replace(/\s/g, "").length
  const totalChars = md.length
  const h2Count = (md.match(/^##\s+/gm) ?? []).length
  const h3Count = (md.match(/^###\s+/gm) ?? []).length
  const bodyParas = md.split(/\n\n+/).filter(Boolean).length
  const has플라트Standalone = /플라트(?![ ]?라이프)/.test(md)
  const has플라트라이프붙여 = /(?<![ ])플라트라이프/.test(md)
  console.log("---")
  console.log("id:", d.id)
  console.log("title:", d.title)
  console.log("created:", d.created_at)
  console.log("status:", d.status)
  console.log(`chars: total=${totalChars}, no-ws=${noWs}`)
  console.log(`structure: H2=${h2Count}, H3=${h3Count}, paragraphs=${bodyParas}`)
  console.log(`brand: 플라트(단독)=${has플라트Standalone}, 플라트라이프(붙여)=${has플라트라이프붙여}`)
  console.log("first 400 chars:", md.slice(0, 400).replace(/\n/g, " ⏎ "))
  console.log("last 250 chars:", md.slice(-250).replace(/\n/g, " ⏎ "))
}
