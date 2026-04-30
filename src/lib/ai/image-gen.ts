/**
 * Imagen 이미지 생성 wrapper — Vertex AI Express Mode.
 *
 * ⚠️ Server-only. 이미지 base64 를 반환 → 호출자가 Storage 에 업로드.
 *
 * 모델 후보 (fallback 체인, 품질 우선):
 *   - imagen-3.0-fast-generate-001  (기본 · 저렴 ~$0.02/장)
 *   - imagen-3.0-generate-002       (품질 좀 더)
 *   - imagen-3.0-generate-001       (구 버전)
 */

import "server-only"
import { GoogleGenAI } from "@google/genai"
import { googleApiKey } from "./provider"

const IMAGE_MODEL_FALLBACKS = [
  "imagen-4.0-generate-001",
  "imagen-4.0-fast-generate-001",
  "imagen-3.0-generate-002",
  "imagen-3.0-generate-001",
]

let _client: GoogleGenAI | null = null
function client() {
  if (!_client) {
    _client = new GoogleGenAI({ apiKey: googleApiKey() })
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

const RETRYABLE = /(429|overload|unavailable|quota|rate|exceed|RESOURCE_EXHAUSTED)/i

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

interface GenaiImageResponse {
  generatedImages?: Array<{
    image?: { imageBytes?: string; mimeType?: string }
  }>
}

/**
 * 단일 이미지 생성. fallback 체인과 재시도 포함.
 * @param prompt 영문 이미지 설명 (photorealistic, style, subject, lighting, camera 등)
 */
export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const modelErrors: Array<{ model: string; error: string }> = []
  for (const modelName of IMAGE_MODEL_FALLBACKS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = (await client().models.generateImages({
          model: modelName,
          prompt,
          config: {
            numberOfImages: 1,
            aspectRatio: "16:9",
            /* ※ negativePrompt 는 Imagen 4 에서 deprecated → 제거.
               텍스트·간판 차단은 prompt 자체와 STYLE_SUFFIX 의 강력한 NO 가이드로. */
          },
        })) as GenaiImageResponse

        const img = res.generatedImages?.[0]?.image
        const base64 = img?.imageBytes ?? ""
        const mimeType = img?.mimeType ?? "image/png"
        if (base64) {
          const bytes = Math.floor((base64.length * 3) / 4)
          return { mimeType, base64, model: modelName, bytes }
        }
        modelErrors.push({ model: modelName, error: "image part missing in response" })
        break
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        const shortMsg = msg.slice(0, 200)
        if (!RETRYABLE.test(msg)) {
          modelErrors.push({ model: modelName, error: shortMsg })
          break
        }
        if (attempt < 1) {
          await sleep(1200)
          continue
        }
        modelErrors.push({ model: modelName, error: shortMsg })
      }
    }
    console.warn(`[image-gen] ${modelName} exhausted`)
  }
  const summary = modelErrors.map((e) => `[${e.model}] ${e.error}`).join(" | ")
  throw new Error(`이미지 생성 실패 (모든 모델 소진): ${summary}`)
}
