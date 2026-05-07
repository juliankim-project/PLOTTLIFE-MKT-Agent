import { createClient } from "@supabase/supabase-js"
import { config } from "dotenv"
config({ path: ".env.local" })

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const db = createClient(url, key)

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
  .select("id, title, body_markdown, created_at")
  .order("created_at", { ascending: false })
  .limit(15)

let leakCount = 0
for (const d of data) {
  const md = d.body_markdown ?? ""
  const hits = BANNED.filter((b) => md.includes(b))
  if (hits.length > 0) {
    leakCount++
    console.log(`❌ ${d.id}  ${d.created_at}`)
    console.log(`   title: ${d.title.slice(0, 70)}`)
    console.log(`   leaked: ${hits.join(", ")}`)
    for (const b of [...new Set(hits)].slice(0, 3)) {
      const idx = md.indexOf(b)
      const ctx = md.slice(Math.max(0, idx-50), idx+b.length+80).replace(/\n/g," ⏎ ")
      console.log(`   "${b}": ...${ctx}...`)
    }
    console.log("")
  }
}
console.log(`---\n총 ${data.length}건 중 ${leakCount}건 유출 발견`)
