/**
 * Draft 의 이미지 생성 파이프라인 — route 와 automation 양쪽에서 재사용.
 *
 * 흐름:
 *  1) draft + persona 로드
 *  2) IMAGE_SLOT 추출 + Creative Designer 영문 prompt 생성 (hero + inline)
 *  3) Imagen 으로 이미지 생성
 *  4) Supabase Storage 업로드
 *  5) body_markdown 의 IMAGE_SLOT 주석을 실제 ![alt](url) 로 치환
 *  6) drafts.body_markdown + hero_image_url 업데이트
 *
 * 실패 (모든 슬롯 실패) 시 ok:false. 일부 실패는 진행 + failures 기록.
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"
import {
  extractImageSlots,
  replaceSlotsWithImages,
  buildImagePrompts,
  reinforceSafePrompt,
} from "./image-prompt"
import { generateImage } from "./image-gen"
import { uploadBase64Image } from "@/lib/images/upload"

/**
 * draft 의 이미지 매니페스트 — 단일 재생성 시 원본 prompt 추적용.
 * drafts.metadata.images 에 저장.
 */
export interface ImageManifestEntry {
  kind: "hero" | "inline"
  index: number
  url: string
  alt: string
  prompt: string
  generatedAt: string
}

export interface ImagePipelineResult {
  ok: boolean
  heroUrl?: string | null
  inline?: Array<{ index: number; url: string; altKo: string }>
  replacedSlots?: number
  failures?: string[]
  error?: string
}

export async function generateImagesForDraft(draftId: string): Promise<ImagePipelineResult> {
  const db = supabaseAdmin()

  /* 1. draft + persona 로드 */
  const { data: draft, error: draftErr } = await db
    .from("drafts")
    .select("id, project_id, topic_id, title, body_markdown, hero_image_url")
    .eq("id", draftId)
    .single()
  if (draftErr || !draft) {
    return { ok: false, error: `draft not found (id=${draftId})` }
  }

  const topicTitle = draft.title ?? ""
  let personaLabel = "외국인 게스트"
  if (draft.topic_id) {
    const { data: t } = await db
      .from("topics")
      .select("persona_id")
      .eq("id", draft.topic_id)
      .maybeSingle()
    if (t?.persona_id) {
      const { data: p } = await db
        .from("personas")
        .select("label")
        .eq("id", t.persona_id)
        .maybeSingle()
      if (p) personaLabel = p.label
    }
  }

  const body = draft.body_markdown ?? ""
  const slots = extractImageSlots(body)

  try {
    /* 2. 영문 prompt 생성 (hero + inline) */
    const plannedSlots: Array<{ kind: "hero" | "inline"; index: number; description: string }> = [
      { kind: "hero", index: 0, description: `커버 이미지 — ${topicTitle}` },
      ...slots.map((s) => ({ kind: "inline" as const, index: s.index, description: s.description })),
    ]
    const prompts = await buildImagePrompts({
      projectId: draft.project_id,
      topicTitle,
      personaLabel,
      slots: plannedSlots,
    })

    /* 3-4. 이미지 생성 + Supabase Storage 업로드 (순차) */
    const generated: Array<{ kind: "hero" | "inline"; index: number; url: string; altKo: string; prompt: string }> = []
    const failures: string[] = []
    for (const p of prompts) {
      try {
        const img = await generateImage(p.prompt)
        const slotName = p.kind === "hero" ? "hero" : `section-${p.index}`
        const up = await uploadBase64Image({
          draftId: draft.id,
          slotName,
          base64: img.base64,
          mimeType: img.mimeType,
        })
        generated.push({ kind: p.kind, index: p.index, url: up.publicUrl, altKo: p.altKo, prompt: p.prompt })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.warn(`[image-pipeline] slot ${p.kind}-${p.index} 실패:`, msg)
        failures.push(`${p.kind}-${p.index}: ${msg.slice(0, 300)}`)
      }
    }

    if (generated.length === 0) {
      return { ok: false, error: "이미지 생성 실패 — 모든 슬롯 실패", failures }
    }

    /* 5. body 의 IMAGE_SLOT 치환 + hero 저장 */
    const heroImg = generated.find((g) => g.kind === "hero")
    const inlineImgs = generated.filter((g) => g.kind === "inline")
    const mapping = inlineImgs
      .map((g) => {
        const slot = slots.find((s) => s.index === g.index)
        return {
          slotIndex: g.index,
          url: g.url,
          alt: g.altKo,
          raw: slot?.raw ?? "",
        }
      })
      .filter((m) => m.raw)

    const newBody = replaceSlotsWithImages(body, mapping)

    /* 6. 매니페스트 (단일 재생성용 추적 정보) */
    const manifest: ImageManifestEntry[] = generated.map((g) => ({
      kind: g.kind,
      index: g.index,
      url: g.url,
      alt: g.altKo,
      prompt: g.prompt,
      generatedAt: new Date().toISOString(),
    }))

    /* drafts.metadata.images 에 매니페스트 저장 */
    const { data: currentDraft } = await db
      .from("drafts")
      .select("metadata")
      .eq("id", draftId)
      .single()
    const baseMeta = (currentDraft?.metadata as Record<string, unknown> | null) ?? {}

    const updatePatch: Record<string, unknown> = {
      body_markdown: newBody,
      metadata: { ...baseMeta, images: manifest },
    }
    if (heroImg) updatePatch.hero_image_url = heroImg.url

    await db.from("drafts").update(updatePatch).eq("id", draftId)

    return {
      ok: true,
      heroUrl: heroImg?.url ?? null,
      inline: inlineImgs.map(({ index, url, altKo }) => ({ index, url, altKo })),
      replacedSlots: mapping.length,
      failures: failures.length > 0 ? failures : undefined,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { ok: false, error: msg }
  }
}

/* ─────────────────────────────────────────────────────────────
 * 단일 이미지 재생성 — 사용자가 콘텐츠 페이지에서 hero 또는 본문 이미지
 * 1장만 재생성할 때.
 *
 * 흐름:
 *  1) draft + 매니페스트 로드 (metadata.images)
 *  2) kind+index 로 대상 매니페스트 entry 찾기
 *  3) 저장된 prompt 를 reinforceSafePrompt 로 더 안전하게 재가공
 *  4) 새 이미지 생성 + Storage 업로드 (slotName 에 timestamp 붙여 캐시 회피)
 *  5) hero 면 hero_image_url 갱신, inline 이면 body_markdown 의 ![alt](oldUrl) → 새 URL
 *  6) metadata.images 매니페스트 entry 갱신
 * ─────────────────────────────────────────────────────────── */

export interface RegenerateInput {
  draftId: string
  kind: "hero" | "inline"
  /** hero 면 0, inline 이면 IMAGE_SLOT 의 1-based index */
  index: number
}

export interface RegenerateResult {
  ok: boolean
  newUrl?: string
  error?: string
}

export async function regenerateSingleImage(input: RegenerateInput): Promise<RegenerateResult> {
  const db = supabaseAdmin()

  /* 1. draft 로드 */
  const { data: draft, error: draftErr } = await db
    .from("drafts")
    .select("id, project_id, topic_id, title, body_markdown, hero_image_url, metadata")
    .eq("id", input.draftId)
    .single()
  if (draftErr || !draft) {
    return { ok: false, error: `draft not found (id=${input.draftId})` }
  }

  /* 2. 매니페스트 entry 찾기 */
  const meta = (draft.metadata as Record<string, unknown> | null) ?? {}
  const manifest = (meta.images as ImageManifestEntry[] | undefined) ?? []
  const entry = manifest.find((e) => e.kind === input.kind && e.index === input.index)

  /* 3. prompt 결정 — 매니페스트 있으면 그거, 없으면 fallback 으로 새로 만듦 */
  let prompt: string
  let altKo: string
  if (entry) {
    prompt = reinforceSafePrompt(entry.prompt)
    altKo = entry.alt
  } else {
    /* 매니페스트 없는 옛 draft — 현재 draft 정보로 fresh 프롬프트 1개 생성 */
    let personaLabel = "외국인 게스트"
    if (draft.topic_id) {
      const { data: t } = await db
        .from("topics")
        .select("persona_id")
        .eq("id", draft.topic_id)
        .maybeSingle()
      if (t?.persona_id) {
        const { data: p } = await db
          .from("personas")
          .select("label")
          .eq("id", t.persona_id)
          .maybeSingle()
        if (p) personaLabel = p.label
      }
    }
    const slots =
      input.kind === "hero"
        ? [{ kind: "hero" as const, index: 0, description: `커버 이미지 — ${draft.title}` }]
        : (() => {
            const found = extractImageSlots(draft.body_markdown ?? "").find((s) => s.index === input.index)
            return [
              {
                kind: "inline" as const,
                index: input.index,
                description: found?.description ?? `섹션 ${input.index} 일러스트`,
              },
            ]
          })()
    const built = await buildImagePrompts({
      projectId: draft.project_id,
      topicTitle: draft.title,
      personaLabel,
      slots,
    })
    const first = built[0]
    if (!first) return { ok: false, error: "프롬프트 생성 실패" }
    prompt = reinforceSafePrompt(first.prompt)
    altKo = first.altKo
  }

  /* 4. 이미지 생성 + 업로드 */
  let img
  try {
    img = await generateImage(prompt)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
  const ts = Date.now()
  const slotName = input.kind === "hero" ? `hero-${ts}` : `section-${input.index}-${ts}`
  const up = await uploadBase64Image({
    draftId: draft.id,
    slotName,
    base64: img.base64,
    mimeType: img.mimeType,
  })
  const newUrl = up.publicUrl

  /* 5. body / hero 갱신 */
  const oldUrl = entry?.url ?? (input.kind === "hero" ? draft.hero_image_url : null)
  const updatePatch: Record<string, unknown> = {}

  if (input.kind === "hero") {
    updatePatch.hero_image_url = newUrl
  } else if (oldUrl && draft.body_markdown) {
    /* 본문에서 정확히 같은 URL 매칭으로 안전 치환 */
    const escaped = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const newBody = (draft.body_markdown ?? "").replace(new RegExp(escaped, "g"), newUrl)
    updatePatch.body_markdown = newBody
  } else if (draft.body_markdown) {
    /* 옛 draft + 매니페스트 없음 → N번째 ![](url) 이미지를 찾아 치환 (best-effort) */
    const re = /!\[[^\]]*\]\(([^)]+)\)/g
    const matches: Array<{ raw: string; url: string }> = []
    let m: RegExpExecArray | null
    while ((m = re.exec(draft.body_markdown)) !== null) {
      matches.push({ raw: m[0], url: m[1] })
    }
    const target = matches[input.index - 1]
    if (target) {
      const newMd = `![${altKo.replace(/]/g, "")}](${newUrl})`
      updatePatch.body_markdown = draft.body_markdown.replace(target.raw, newMd)
    }
  }

  /* 6. 매니페스트 갱신 */
  const newEntry: ImageManifestEntry = {
    kind: input.kind,
    index: input.index,
    url: newUrl,
    alt: altKo,
    prompt,
    generatedAt: new Date().toISOString(),
  }
  const newManifest = entry
    ? manifest.map((e) => (e.kind === entry.kind && e.index === entry.index ? newEntry : e))
    : [...manifest, newEntry]
  updatePatch.metadata = { ...meta, images: newManifest }

  const { error: updErr } = await db.from("drafts").update(updatePatch).eq("id", draft.id)
  if (updErr) return { ok: false, error: updErr.message }

  return { ok: true, newUrl }
}
