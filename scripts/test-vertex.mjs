#!/usr/bin/env node
/**
 * Vertex AI Express Mode 연결 테스트 — 키 값은 절대 출력 안 함.
 * 사용: node scripts/test-vertex.mjs
 */

import { readFileSync } from "fs"
import { resolve } from "path"

// .env.local 수동 로드 (dotenv 의존 피함)
try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8")
  for (const line of env.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i)
    if (m) {
      const key = m[1]
      let val = m[2]
      // 따옴표 제거
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1)
      }
      if (!process.env[key]) process.env[key] = val
    }
  }
} catch (e) {
  console.error("❌ .env.local 로드 실패:", e.message)
  process.exit(1)
}

const rawKey = process.env.GOOGLE_VERTEX_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
if (!rawKey) {
  console.error("❌ GOOGLE_VERTEX_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY 둘 다 없음")
  process.exit(1)
}

function mask(k) {
  if (!k) return "<empty>"
  const prefix = k.slice(0, 4)
  return `${prefix}${"*".repeat(Math.min(k.length - 4, 12))}...(len=${k.length})`
}

console.log(`✓ 키 감지: ${mask(rawKey)}`)
console.log(`  소스: ${process.env.GOOGLE_VERTEX_API_KEY ? "GOOGLE_VERTEX_API_KEY" : "GOOGLE_GENERATIVE_AI_API_KEY"}`)

const { GoogleGenAI } = await import("@google/genai")

const ai = new GoogleGenAI({ apiKey: rawKey })

const testModels = [
  { name: "gemini-2.5-flash", label: "Flash" },
  { name: "gemini-2.5-pro", label: "Pro" },
]

let anyOk = false
for (const { name, label } of testModels) {
  process.stdout.write(`\n[${label}] ${name}: `)
  const started = Date.now()
  try {
    const res = await ai.models.generateContent({
      model: name,
      contents: "안녕, '플라트라이프'라고만 짧게 한글로 대답해줘.",
      config: { temperature: 0, maxOutputTokens: 50 },
    })
    const text = (res.text ?? "").trim().slice(0, 80)
    const dur = Date.now() - started
    console.log(`✅ ${dur}ms — "${text}"`)
    anyOk = true
  } catch (err) {
    const msg = err?.message || String(err)
    console.log(`❌ ${msg.slice(0, 200)}`)
  }
}

/* 이미지 모델 여러 개 시도 (Express Mode가 뭘 지원하는지 모르므로) */
const imageCandidates = [
  "imagen-4.0-generate-001",
  "imagen-4.0-fast-generate-001",
  "imagen-3.0-generate-002",
  "imagen-3.0-generate-001",
  "imagen-3.0-fast-generate-001",
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
]

for (const model of imageCandidates) {
  process.stdout.write(`[Imagen] ${model}: `)
  try {
    const started = Date.now()
    // Imagen API first
    let b64 = ""
    let mime = "?"
    if (model.startsWith("imagen")) {
      const res = await ai.models.generateImages({
        model,
        prompt: "a minimal line drawing of a key, monochrome",
        config: { numberOfImages: 1, aspectRatio: "1:1" },
      })
      const img = res?.generatedImages?.[0]?.image
      b64 = img?.imageBytes ?? ""
      mime = img?.mimeType ?? "?"
    } else {
      // Gemini image via generateContent
      const res = await ai.models.generateContent({
        model,
        contents: "generate a minimal line drawing of a key, monochrome",
      })
      const parts = res?.candidates?.[0]?.content?.parts ?? []
      for (const p of parts) {
        const inl = p?.inlineData ?? p?.inline_data
        if (inl?.data) {
          b64 = inl.data
          mime = inl.mimeType ?? inl.mime_type ?? "image/png"
          break
        }
      }
    }
    const dur = Date.now() - started
    const bytes = Math.floor((b64.length * 3) / 4)
    console.log(`${b64 ? `✅ ${dur}ms · ${bytes}B (${mime})` : "❌ no imageBytes"}`)
    if (b64) break // 첫 성공 모델 찾으면 중단
  } catch (err) {
    const msg = err?.message || String(err)
    const short = msg.match(/"message":"([^"]+)"/)?.[1] || msg.slice(0, 120)
    console.log(`❌ ${short}`)
  }
}

console.log("")
process.exit(anyOk ? 0 : 2)
