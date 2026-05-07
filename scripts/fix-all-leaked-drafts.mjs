import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
config({ path: ".env.local" })

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const BANNED = [
  "엔코스테이","미스터멘션","Mr.Mention","MrMention","위홈","Wehome","스테이폴리오","Stayfolio",
  "더스테이","코지스테이","넘버25","블루그라운드","Blueground","어반스테이",
  "야놀자","Yanolja","여기어때","에어비앤비","Airbnb","airbnb",
  "부킹닷컴","Booking.com","아고다","Agoda","익스피디아","Expedia","트립닷컴","Trip.com","호텔스닷컴",
  "켄싱턴","롯데호텔","신라호텔","신라스테이","메리어트","Marriott","힐튼","Hilton",
  "하얏트","Hyatt","포시즌","Four Seasons","인터컨티넨탈","쉐라톤","L7","노보텔","조선호텔","글래드"
]

const { data } = await db
  .from("drafts")
  .select("id, title, body_markdown")
  .order("created_at", { ascending: false })
  .limit(50)

let fixed = 0
for (const d of data) {
  const before = d.body_markdown ?? ""
  const hits = BANNED.filter((b) => before.includes(b))
  if (hits.length === 0) continue

  const cleaned = before
    .split(/\r?\n/)
    .map((line) => {
      if (!BANNED.some((b) => line.includes(b))) return line
      const sentences = line.split(/(?<=[.!?。])\s+/)
      return sentences.filter((s) => !BANNED.some((b) => s.includes(b))).join(" ")
    })
    .join("\n")

  const remaining = BANNED.filter((b) => cleaned.includes(b))
  console.log(`${d.id} (${d.title.slice(0, 50)})`)
  console.log(`  before=${before.length}c hits=${hits.join(",")} → after=${cleaned.length}c hits=${remaining.join(",") || "none"}`)
  await db.from("drafts").update({ body_markdown: cleaned }).eq("id", d.id)
  fixed++
}
console.log(`---\n총 ${data.length}건 중 ${fixed}건 정화`)
