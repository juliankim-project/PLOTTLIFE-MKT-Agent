/**
 * AI Provider — Unified interface for Anthropic / OpenAI / Google.
 *
 * Google 은 @google/genai (신규 SDK) 사용.
 * - Vertex AI Express Mode: GOOGLE_VERTEX_API_KEY (우선)
 * - 구 AI Studio 키(GOOGLE_GENERATIVE_AI_API_KEY) 는 fallback 호환
 *
 * ⚠️ Server-only. API 키는 절대 클라이언트에 노출되지 않음.
 */

import "server-only"
import Anthropic from "@anthropic-ai/sdk"
import OpenAI from "openai"
import { GoogleGenAI } from "@google/genai"

export type Provider = "anthropic" | "openai" | "google"

export interface AIMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface CompletionOptions {
  provider: Provider
  model: string
  system?: string
  messages: AIMessage[]
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
let _genai: GoogleGenAI | null = null

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

/** Vertex Express Mode 우선 · AI Studio fallback */
export function googleApiKey(): string {
  const vertex = process.env.GOOGLE_VERTEX_API_KEY
  const studio = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  const key = vertex || studio
  if (!key) throw new Error("GOOGLE_VERTEX_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY not set")
  return key
}

function genai() {
  if (!_genai) {
    _genai = new GoogleGenAI({ apiKey: googleApiKey() })
  }
  return _genai
}

// ── Available providers ────────────────────────────────────────
export function availableProviders(): Record<Provider, boolean> {
  return {
    anthropic: Boolean(process.env.ANTHROPIC_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    google: Boolean(process.env.GOOGLE_VERTEX_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY),
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

// ── Google Gemini (Vertex Express + fallback chain) ───────────
const GEMINI_FALLBACKS: Record<string, string[]> = {
  "gemini-2.5-pro":          ["gemini-2.5-flash"],
  "gemini-2.5-flash":        ["gemini-2.5-flash-lite"],
  "gemini-2.5-flash-lite":   ["gemini-2.0-flash-lite"],
  "gemini-2.0-flash":        ["gemini-2.0-flash-lite"],
  "gemini-2.0-flash-lite":   [],
  "gemini-flash-latest":     ["gemini-2.5-flash"],
  "gemini-pro-latest":       ["gemini-2.5-pro", "gemini-2.5-flash"],
}

const RETRYABLE_GEMINI = /(503|429|overload|unavailable|exceed|rate|RESOURCE_EXHAUSTED)/i

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

interface GenaiTextResponse {
  text?: string
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
}

async function callGeminiOnce(modelName: string, opts: CompletionOptions): Promise<CompletionResult> {
  const ai = genai()

  // messages → contents (@google/genai 형식)
  const contents = opts.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }))

  const res = (await ai.models.generateContent({
    model: modelName,
    contents,
    config: {
      systemInstruction: opts.system,
      temperature: opts.temperature,
      maxOutputTokens: opts.max_tokens,
      responseMimeType: opts.json ? "application/json" : undefined,
    },
  })) as GenaiTextResponse

  const text =
    res.text ??
    (res.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "")

  return {
    text,
    provider: "google",
    model: modelName,
    inputTokens: res.usageMetadata?.promptTokenCount,
    outputTokens: res.usageMetadata?.candidatesTokenCount,
    raw: res,
  }
}

async function callGemini(opts: CompletionOptions): Promise<CompletionResult> {
  const candidates = [opts.model, ...(GEMINI_FALLBACKS[opts.model] ?? [])]
  let lastErr: unknown = null
  for (let i = 0; i < candidates.length; i++) {
    const modelName = candidates[i]
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

/** 품질 모드 → 실제 model id 매핑 */
export type Quality = "flash" | "pro"
export function qualityToModel(q: Quality): string {
  return q === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash"
}
