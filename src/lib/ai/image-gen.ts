/**
 * Gemini 이미지 생성 wrapper.
 *
 * ⚠️ Server-only. 이미지 base64 를 반환 → 호출자가 Storage 에 업로드.
 * ⚠️ 무료 tier quota 초과 시 429. Google Cloud 결제 활성화하면 해제.
 *
 * 모델 후보 (fallback 체인):
 *   - gemini-2.5-flash-image       (stable)
 *   - gemini-2.5-flash-image-preview
 *   - gemini-2.0-flash-preview-image-generation
 */

import "server-only"
import { GoogleGenerativeAI } from "@google/generative-ai"

const IMAGE_MODEL_FALLBACKS = [
  "gemini-2.5-flash-image",
  "gemini-2.5-flash-image-preview",
  "gemini-2.0-flash-preview-image-generation",
]

let _client: GoogleGenerativeAI | null = null
function client() {
  if (!_client) {
    const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not set")
    _client = new GoogleGenerativeAI(key)
  }
  return _client
}

export interface GeneratedImage {
  mimeType: string
  /** base64 encoded image data (no prefix) */
  base64: string
  /** which model actually produced it */
  model: string
  /** convenience: decoded byte length */
  bytes: number
}

const RETRYABLE = /(429|overload|unavailable|quota|rate|exceed)/i

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/**
 * 단일 이미지 생성. fallback 체인과 재시도 포함.
 * @param prompt 영문 이미지 설명 (photorealistic, style, subject, lighting, camera 등)
 */
export async function generateImage(prompt: string): Promise<GeneratedImage> {
  let lastErr: unknown = null
  for (const modelName of IMAGE_MODEL_FALLBACKS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = client().getGenerativeModel({ model: modelName })
        const result = await model.generateContent(prompt)
        const parts = result.response?.candidates?.[0]?.content?.parts ?? []
        for (const p of parts) {
          // SDK 두 형식 모두 지원 (camelCase / snake_case)
          const inline =
            (p as { inlineData?: { mimeType?: string; data?: string } }).inlineData ??
            ((p as { inline_data?: { mime_type?: string; data?: string } }).inline_data as
              | { mime_type?: string; data?: string }
              | undefined)
          if (inline) {
            const mimeType =
              (inline as { mimeType?: string }).mimeType ??
              (inline as { mime_type?: string }).mime_type ??
              "image/png"
            const base64 = (inline as { data?: string }).data ?? ""
            if (base64) {
              const bytes = Math.floor((base64.length * 3) / 4)
              return { mimeType, base64, model: modelName, bytes }
            }
          }
        }
        // 이미지 part 없음 → 다음 모델로
        lastErr = new Error(`${modelName}: image part missing in response`)
        break
      } catch (err) {
        lastErr = err
        const msg = err instanceof Error ? err.message : String(err)
        if (!RETRYABLE.test(msg)) throw err
        if (attempt < 1) {
          await sleep(1200)
          continue
        }
      }
    }
    console.warn(`[image-gen] ${modelName} exhausted, trying next…`)
  }
  throw lastErr instanceof Error
    ? new Error(`이미지 생성 실패 (모든 모델 소진): ${lastErr.message}`)
    : new Error("이미지 생성 실패")
}
