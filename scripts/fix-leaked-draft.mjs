import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
config({ path: ".env.local" })

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const TARGET_ID = "b63976c6-fa62-4e0f-b438-4b9565947536"

const { data: draft } = await db
  .from("drafts")
  .select("id, body_markdown")
  .eq("id", TARGET_ID)
  .single()

if (!draft) { console.log("not found"); process.exit(1) }

const before = draft.body_markdown ?? ""
const BANNED = ["엔코스테이"]

/* 라인 단위로, 금지 브랜드 포함된 라인을 통째로 제거 */
const cleaned = before
  .split(/\r?\n/)
  .map((line) => {
    if (!BANNED.some((b) => line.includes(b))) return line
    /* 문장 단위 분리 + 해당 문장만 제거 */
    const sentences = line.split(/(?<=[.!?。])\s+/)
    return sentences.filter((s) => !BANNED.some((b) => s.includes(b))).join(" ")
  })
  .join("\n")

console.log(`before: ${before.length} chars, hits=${BANNED.filter(b=>before.includes(b)).join(",")}`)
console.log(`after:  ${cleaned.length} chars, hits=${BANNED.filter(b=>cleaned.includes(b)).join(",") || "none"}`)

const { error } = await db.from("drafts").update({ body_markdown: cleaned }).eq("id", TARGET_ID)
if (error) console.error(error); else console.log("✅ updated")
