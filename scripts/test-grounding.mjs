#!/usr/bin/env node
/** Google Search Grounding 검증 — Vertex Express */

import { readFileSync } from "fs"
import { resolve } from "path"

const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8")
for (const line of env.split("\n")) {
  const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
}

const apiKey = process.env.GOOGLE_VERTEX_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
if (!apiKey) {
  console.error("❌ key 없음")
  process.exit(1)
}

const { GoogleGenAI } = await import("@google/genai")
const ai = new GoogleGenAI({ apiKey })

console.log("🔍 grounded + system+messages 형식 호출…")
const t0 = Date.now()
const res = await ai.models.generateContent({
  model: "gemini-2.5-flash",
  contents: [
    {
      role: "user",
      parts: [
        {
          text:
            "외국인 유학생이 한국에서 ARC 발급받는 절차를 1500자로 작성해줘. 2026년 출입국·외국인청 최신 공지를 검색해 반영하고, 수치는 출처와 함께.",
        },
      ],
    },
  ],
  config: {
    systemInstruction: "당신은 플라트라이프 카피라이터입니다. 친근한 한국어로 작성하세요.",
    tools: [{ googleSearch: {} }],
    temperature: 0.5,
    maxOutputTokens: 4000,
    thinkingConfig: { thinkingBudget: 0 },
  },
})
const dur = Date.now() - t0

console.log(`\n✅ ${dur}ms`)
console.log(`\n--- TEXT ---\n${res.text?.slice(0, 800)}\n`)

const chunks = res.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []
console.log(`\n--- SOURCES (${chunks.length}) ---`)
for (const c of chunks.slice(0, 8)) {
  console.log(`- ${c.web?.title ?? "(no title)"}\n  ${c.web?.uri}`)
}
