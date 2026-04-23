/**
 * AI Provider — Unified interface for Anthropic / OpenAI / Google.
 *
 * ⚠️ Server-only. API 키는 절대 클라이언트에 노출되지 않음.
 *    Route handler에서 호출되고, 결과만 JSON으로 내려준다.
 */

import "server-only"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { GoogleGenerativeAI } from "@google/generative-ai"

export type Provider = "anthropic" | "openai" | "google"

export interface AIMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface CompletionOptions {
  provider: Provider
  model: string
  system?: string
  messages: Omit<AIMessage, "role"> extends never ? never : AIMessage[]
  temperature?: number
  max_tokens?: number
  /** JSON mode — 응답을 JSON 객체로 강제 */
  json?: boolean
}

export interface CompletionResult {
  text: string
  provider: Provider
  model: string
  inputTokens?: number
  outputTokens?: number
  raw?: unknown
}

// ── Singleton clients ──────────────────────────────────────────
let _anthropic: Anthropic | null = null
let _openai: OpenAI | null = null
let _gemini: GoogleGenerativeAI | null = null

function anthropic() {
  if (!_anthropic) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error("ANTHROPIC_API_KEY not set")
    _anthropic = new Anthropic({ apiKey: key })
  }
  return _anthropic
}
function openai() {
  if (!_openai) {
    const key = process.env.OPENAI_API_KEY
    if (!key) throw new Error("OPENAI_API_KEY not set")
    _openai = new OpenAI({ apiKey: key })
  }
  return _openai
}
function gemini() {
  if (!_gemini) {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not set")
    _gemini = new GoogleGenerativeAI(key)
  }
  return _gemini
}

// ── Available providers (키 존재 여부) ─────────────────────────
export function availableProviders(): Record<Provider, boolean> {
  return {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    google: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY),
  }
}

// ── Unified complete() ────────────────────────────────────────
export async function complete(opts: CompletionOptions): Promise<CompletionResult> {
  switch (opts.provider) {
    case "anthropic":
      return callAnthropic(opts)
    case "openai":
      return callOpenAI(opts)
    case "google":
      return callGemini(opts)
    default:
      throw new Error(`Unknown provider: ${opts.provider}`)
  }
}

// ── Anthropic ──────────────────────────────────────────────────
async function callAnthropic(opts: CompletionOptions): Promise<CompletionResult> {
  const client = anthropic()
  const msgs = opts.messages.filter((m) => m.role !== "system")
  const systemBlock = [opts.system, ...opts.messages.filter((m) => m.role === "system").map((m) => m.content)]
    .filter(Boolean)
    .join("\n\n")

  const res = await client.messages.create({
    model: opts.model,
    max_tokens: opts.max_tokens ?? 4096,
    temperature: opts.temperature,
    system: systemBlock || undefined,
    messages: msgs.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  })

  const text = res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")

  return {
    text,
    provider: "anthropic",
    model: opts.model,
    inputTokens: res.usage?.input_tokens,
    outputTokens: res.usage?.output_tokens,
    raw: res,
  }
}

// ── OpenAI ─────────────────────────────────────────────────────
async function callOpenAI(opts: CompletionOptions): Promise<CompletionResult> {
  const client = openai()
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []
  if (opts.system) messages.push({ role: "system", content: opts.system })
  for (const m of opts.messages) {
    messages.push({ role: m.role, content: m.content })
  }
  const res = await client.chat.completions.create({
    model: opts.model,
    messages,
    temperature: opts.temperature,
    max_tokens: opts.max_tokens,
    response_format: opts.json ? { type: "json_object" } : undefined,
  })
  const text = res.choices[0]?.message?.content ?? ""
  return {
    text,
    provider: "openai",
    model: opts.model,
    inputTokens: res.usage?.prompt_tokens,
    outputTokens: res.usage?.completion_tokens,
    raw: res,
  }
}

// ── Google Gemini (with retry + model fallback) ───────────────
// Vercel Hobby 서버리스 함수는 최대 60초 → 총 실행 40초 이내로 제한.
// 같은 모델 2회 재시도 + 최대 1단계 fallback.
const GEMINI_FALLBACKS: Record<string, string[]> = {
  "gemini-2.5-pro": ["gemini-2.5-flash"],
  "gemini-2.5-flash": ["gemini-flash-latest"],
  "gemini-flash-latest": ["gemini-2.0-flash"],
  "gemini-pro-latest": ["gemini-flash-latest"],
  "gemini-2.0-flash": ["gemini-2.0-flash-lite"],
}

const RETRYABLE_GEMINI = /(503|429|overload|unavailable|exceed|rate)/i

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function callGeminiOnce(modelName: string, opts: CompletionOptions): Promise<CompletionResult> {
  const client = gemini()
  const model = client.getGenerativeModel({
    model: modelName,
    systemInstruction: opts.system,
    generationConfig: {
      temperature: opts.temperature,
      maxOutputTokens: opts.max_tokens,
      responseMimeType: opts.json ? "application/json" : undefined,
    },
  })
  const history = opts.messages.slice(0, -1).map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))
  const last = opts.messages[opts.messages.length - 1]
  const chat = model.startChat({ history })
  const res = await chat.sendMessage(last?.content ?? "")
  const text = res.response.text()
  const usage = res.response.usageMetadata
  return {
    text,
    provider: "google",
    model: modelName,
    inputTokens: usage?.promptTokenCount,
    outputTokens: usage?.candidatesTokenCount,
    raw: res,
  }
}

async function callGemini(opts: CompletionOptions): Promise<CompletionResult> {
  const candidates = [opts.model, ...(GEMINI_FALLBACKS[opts.model] ?? [])]
  let lastErr: unknown = null
  for (let i = 0; i < candidates.length; i++) {
    const modelName = candidates[i]
    // 같은 모델 2회 재시도 (백오프 0.8s → 1.6s — 총 ~2.5s)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await callGeminiOnce(modelName, opts)
      } catch (err) {
        lastErr = err
        const msg = err instanceof Error ? err.message : String(err)
        const retryable = RETRYABLE_GEMINI.test(msg)
        if (!retryable) throw err
        if (attempt < 1) {
          await sleep(800 * Math.pow(2, attempt))
          continue
        }
      }
    }
    console.warn(`[gemini] ${modelName} exhausted, fallback to ${candidates[i + 1] ?? "(none)"}`)
  }
  throw lastErr instanceof Error
    ? new Error(`Gemini 사용 불가 (혼잡·throttle): ${lastErr.message}`)
    : new Error("Gemini 사용 불가")
}
