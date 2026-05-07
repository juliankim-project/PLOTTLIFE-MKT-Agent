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
  "TEXTLESS, NO TEXT ANYWHERE, NO HANGUL, NO LETTERS. " +
  "Photorealistic editorial photography, warm natural window light, soft shallow depth of field, cinematic color grading, Korean urban residence aesthetic, 35mm lens. " +
  "ABSOLUTE STRICT REQUIREMENT — the entire image MUST be 100% TEXTLESS: " +
  "absolutely NO Korean characters or hangul anywhere, NO English/Japanese/Chinese letters, NO numbers visible as text, " +
  "NO fake squiggly hangul-like shapes, NO gibberish characters, NO stylized typography of any kind, " +
  "NO subway or metro stations of any kind, NO transit infrastructure (no entrances, platforms, station signs, route maps), " +
  "NO street signs with visible text, NO building name plaques, NO storefront signage with readable letters, " +
  "NO restaurant menu boards, NO cafe signs with words, NO bookstore signs, NO pharmacy crosses with text, " +
  "NO school signs, NO hospital signs, NO bus stop signs, NO traffic signs with words, " +
  "NO license plates (vehicles, if any, MUST have completely blank or blurred plates), " +
  "NO digital displays showing text, NO TV/monitor/phone screens showing text, NO billboards, NO posters with text, " +
  "NO book covers with readable titles, NO product packaging with brand text, NO clothing with prints/logos, " +
  "NO logos, NO watermarks, NO brand names, NO graffiti with words, NO chalkboards with writing. " +
  "If any signage or paper or screen appears in the background, it MUST be deeply blurred bokeh OR completely abstract shapes — never letterforms, never fake characters, never any glyphs that resemble writing. " +
  "Prefer scenes WITHOUT any signage at all: indoor close-ups, hands-only shots, natural landscapes, abstract architectural details, soft-focus portraits, plant or food close-ups, window light on a wall."

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

   ⚠️ CRITICAL — transit/signage avoidance (zero tolerance):

   The image model FAILS at rendering Korean text. Past outputs showed
   GIBBERISH hangul on station signs ("의동학", "뷰겐") that look like
   fake station names. Users complained this destroys credibility.

   THEREFORE — these scenes are absolutely BANNED in the prompt:
   - subway / metro stations of ANY kind (entrance, platform, exit, sign, map)
   - bus stops with signage
   - any street scene where a station name sign or transit map is visible
   - any neighborhood landmark with its name displayed (storefronts, building names)
   - any wayfinding signage, even in the background

   REFRAME RULES — if the slot description suggests transit / specific places:
   - "지하철역 근처 카페" → "a cozy cafe interior with warm lighting"
   - "홍대 거리" → "a vibrant Korean neighborhood street with autumn trees"
   - "학교 앞 풍경" → "a calm residential street with a young person walking"
   - When in doubt, stay INDOORS (cafe, room, library) or focus on PEOPLE
     (close-up portraits, conversation, daily moments) — these never need signage.

   PLACE NAMES — NEVER use real names: "Hongdae", "Gangnam", "Itaewon",
   "Myeongdong", "Sinchon", any university name, any subway line.
   Use only generic descriptors: "a residential area in Seoul",
   "a trendy district in central Seoul", "a Korean officetel neighborhood".

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
      prompt: sanitizeImagePrompt(String(i.prompt)),
      altKo: String(i.altKo).slice(0, 60),
    }))
}

/**
 * 영문 prompt 후처리 — Creative Designer 가 가이드 어기면 강제 치환.
 * transit/signage 류 단어를 안전한 generic 으로 바꿈.
 */
export function sanitizeImagePrompt(prompt: string): string {
  let p = prompt

  /* 지하철·역 → 안전한 도시 장면 */
  p = p.replace(/\b(?:subway|metro|underground)\s+(?:station|entrance|exit|platform|stop)\b/gi, "city street corner")
  p = p.replace(/\b(?:subway|metro)\s+sign(?:age|s)?\b/gi, "abstract storefront")
  p = p.replace(/\bstation\s+(?:sign|name|platform|entrance|exit|board|display|map)\b/gi, "urban scene")
  p = p.replace(/\b(?:subway|metro|underground)\b/gi, "city")
  p = p.replace(/\btrain\s+(?:platform|station)\b/gi, "indoor cafe scene")
  p = p.replace(/\bbus\s+stop\b/gi, "intersection")
  p = p.replace(/\btraffic\s+sign(?:s)?\b/gi, "abstract urban shapes")

  /* 한국어 텍스트·간판 시각화 단어 → 차단 */
  p = p.replace(/\b(?:korean|hangul|hanja|chinese|japanese|english)\s+(?:text|characters?|letters?|signs?|writing|script|typography)\b/gi, "")
  p = p.replace(/\bwith\s+(?:visible\s+)?(?:text|letters?|characters?|writing|typography)\b/gi, "")
  p = p.replace(/\bsignage\s+with\s+(?:visible\s+)?(?:text|letters?|characters?)\b/gi, "abstract building details")
  p = p.replace(/\bplatform\s+(?:sign|board|map|display)\b/gi, "")
  p = p.replace(/\b(?:street|road|highway)\s+sign(?:s)?\b/gi, "")
  p = p.replace(/\b(?:storefront|shop|store|cafe|restaurant|pharmacy|bookstore|hospital|school|university|bank)\s+(?:sign|signage|board|display|name|nameplate)\b/gi, "blurred facade")
  p = p.replace(/\bmenu\s+(?:board|sign|display)\b/gi, "abstract decor")
  p = p.replace(/\bbillboard(?:s)?\b/gi, "")
  p = p.replace(/\bposter(?:s)?\b/gi, "")
  p = p.replace(/\bbanner(?:s)?\b/gi, "")
  p = p.replace(/\bgraffiti\b/gi, "")
  p = p.replace(/\bchalkboard\b/gi, "")
  p = p.replace(/\bwhiteboard\b/gi, "")
  p = p.replace(/\blicense\s+plate(?:s)?\b/gi, "")
  p = p.replace(/\bnumber\s+plate(?:s)?\b/gi, "")
  p = p.replace(/\bbook\s+cover(?:s)?\b/gi, "blurred book")
  p = p.replace(/\b(?:product|brand)\s+(?:label|packaging|logo)\b/gi, "")
  p = p.replace(/\bnewspaper(?:s)?\b/gi, "blurred paper")
  p = p.replace(/\bmagazine(?:s)?\b/gi, "")
  p = p.replace(/\bsmartphone\s+screen\b/gi, "smartphone (screen off)")
  p = p.replace(/\b(?:laptop|monitor|tablet|tv)\s+(?:screen|display)\b/gi, "blank screen")

  /* 실제 한국 지명·역명·학교명 (혹시 들어가면) → generic */
  p = p.replace(/\b(?:Hongdae|Gangnam|Itaewon|Myeongdong|Sinchon|Apgujeong|Yongsan|Seongsu|Jongno|Mapo|Jamsil|Dongdaemun|Insadong|Garosu|Bukchon|Seocho|Songpa|Nowon|Gangbuk|Gangseo|Yeongdeungpo|Guro|Gwanak|Eunpyeong)\b/gi, "Seoul neighborhood")
  p = p.replace(/\b(?:Yonsei|Korea|Hongik|Ewha|Sogang|Kyunghee|Hanyang|SNU|Konkuk|Sungkyunkwan|Chungang|Sookmyung|Dongguk|Hankuk)\s+University\b/gi, "Seoul university campus")

  /* 연속 공백·콤마 정리 */
  p = p.replace(/,\s*,+/g, ",")
  p = p.replace(/\s{2,}/g, " ").trim()
  return p
}

/** 단일 이미지 재생성용 — 기존 prompt 를 더 안전하게 재가공 */
export function reinforceSafePrompt(originalPrompt: string): string {
  /* 기존 sanitize 한 번 더 + STYLE_SUFFIX 가 이미 끝에 있는지 확인 */
  let p = sanitizeImagePrompt(originalPrompt)
  /* STYLE_SUFFIX 가 prompt 에 이미 들어있어도 한 번 더 강조 — Imagen 이 끝부분 키워드를 더 따름 */
  if (!p.includes("TEXTLESS")) {
    p = `${p}\n\n${STYLE_SUFFIX}`
  } else {
    /* 이미 있으면 추가 강조만 prefix */
    p = `TEXTLESS PHOTOREALISTIC IMAGE — NO HANGUL, NO LETTERS, NO SIGNS. ${p}`
  }
  return p
}
