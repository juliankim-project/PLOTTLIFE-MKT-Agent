/**
 * Creative Designer — 블로그 본문의 IMAGE_SLOT 주석과
 * 주제 브리프를 받아 Gemini Image 용 영문 프롬프트를 만든다.
 *
 * 출력 프롬프트는 포토리얼리스틱·일관된 플라트 비주얼 톤을 유지:
 *  - warm natural light
 *  - editorial photography feel
 *  - Korean setting (Seoul / residence / real everyday moments)
 *  - no text overlays (텍스트 이미지는 블로그 에디터에서 별도 처리)
 */

import "server-only"
import { runAgent } from "./agents"

/** 본문에서 IMAGE_SLOT 주석 찾기 */
export interface SlotMatch {
  /** 원본 주석 전체 (<!-- IMAGE_SLOT_1: ... -->) */
  raw: string
  /** 1-based slot index */
  index: number
  /** 한국어 설명 */
  description: string
}

const SLOT_RE = /<!--\s*IMAGE_SLOT_(\d+)\s*:\s*(.*?)\s*-->/g

export function extractImageSlots(markdown: string): SlotMatch[] {
  const out: SlotMatch[] = []
  let m: RegExpExecArray | null
  const re = new RegExp(SLOT_RE.source, "g")
  while ((m = re.exec(markdown)) !== null) {
    out.push({
      raw: m[0],
      index: parseInt(m[1], 10),
      description: m[2],
    })
  }
  return out
}

/** IMAGE_SLOT 주석을 ![alt](url) 로 치환 */
export function replaceSlotsWithImages(
  markdown: string,
  mapping: Array<{ slotIndex: number; url: string; alt: string; raw: string }>
): string {
  let output = markdown
  for (const m of mapping) {
    const md = `![${m.alt.replace(/]/g, "")}](${m.url})`
    output = output.replace(m.raw, md)
  }
  return output
}

// ── 이미지 프롬프트 생성 ──────────────────────────────────────

interface BuildInput {
  projectId: string
  topicTitle: string
  personaLabel: string
  slots: Array<{ kind: "hero" | "inline"; index: number; description: string }>
}

interface GeneratedImagePrompt {
  kind: "hero" | "inline"
  index: number
  /** 영문 Gemini Image 프롬프트 (80~180 단어) */
  prompt: string
  /** alt 태그용 한국어 (15~30자) */
  altKo: string
}

const STYLE_SUFFIX =
  "Photorealistic editorial photography, warm natural window light, soft shallow depth of field, cinematic color grading, Korean urban residence aesthetic, 35mm lens, NO visible text of any kind, NO Korean characters or hangul, NO subway/metro station signs, NO street signs with text, NO building name plaques, NO storefront signage with readable text, NO logos, NO watermarks, NO brand names. Any signage if present must appear blurred, abstract, out-of-focus, or facing away from camera."

/** 같은 에이전트(Creative Designer)로 여러 프롬프트를 한 번에 */
export async function buildImagePrompts(input: BuildInput): Promise<GeneratedImagePrompt[]> {
  const slotsJson = JSON.stringify(input.slots, null, 2)

  const prompt = `You are generating Gemini Image prompts for a Korean short-term rental blog (Plottlife).

Blog topic: ${input.topicTitle}
Target persona: ${input.personaLabel}

The writer has marked these image slots inside the article body:
${slotsJson}

Each slot has:
  - kind: "hero" (cover) or "inline" (in-body)
  - index: 1-based
  - description: Korean sentence describing the intended visual

Generate for EACH slot:
1. "prompt" — an ENGLISH image prompt suitable for Gemini's text-to-image model.
   - 80~180 words.
   - Photorealistic, Korean urban residence context (Seoul studio / officetel / residence),
     with a foreign or Korean subject if relevant.
   - Warm natural light, editorial mood, 35mm lens, shallow DoF.
   - NO text overlays. NO logos. NO brand names visible.

   ⚠️ Critical place-name rules:
   - NEVER specify real subway stations, neighborhood names, or landmark names
     (e.g., do NOT write "Hongdae station", "Gangnam", "Itaewon", "Myeongdong").
     The image model cannot render correct Korean text and will produce
     fake/garbled hangul on signs — this is a known failure mode.
   - Use generic descriptors instead: "a quiet residential alley in Seoul",
     "a bright cafe street in a trendy Korean neighborhood",
     "a modern Korean officetel building exterior", etc.
   - If a subway/transit scene is required, describe the platform, train, and
     atmosphere WITHOUT showing station signs or location markers.
   - Any incidental signage (storefront, street sign, station name plate)
     should be explicitly described as blurred, out-of-focus, or facing away.

   - Must end with this style suffix verbatim: "${STYLE_SUFFIX}"
2. "altKo" — a natural Korean alt text (15~30 Korean chars) describing the image.

Return JSON only (no markdown code block, no commentary):

{
  "images": [
    {
      "kind": "hero",
      "index": 0,
      "prompt": "Photorealistic 3:2 portrait of ...",
      "altKo": "서울 원룸에서 ..."
    },
    ...
  ]
}

Slot index 0 = hero (cover). Other indices map to the inline slots above.`

  const result = await runAgent({
    agentSlug: "creative-designer",
    stage: "write",
    projectId: input.projectId,
    prompt,
    temperature: 0.6,
    maxTokens: 4000,
    json: true,
  })

  const parsed = result.json as { images?: GeneratedImagePrompt[] } | undefined
  if (!parsed || !Array.isArray(parsed.images)) {
    throw new Error("Creative Designer JSON 파싱 실패")
  }
  return parsed.images
    .filter((i) => i.prompt && i.altKo)
    .map((i) => ({
      kind: i.kind === "hero" ? "hero" : "inline",
      index: typeof i.index === "number" ? i.index : 0,
      prompt: String(i.prompt),
      altKo: String(i.altKo).slice(0, 60),
    }))
}
