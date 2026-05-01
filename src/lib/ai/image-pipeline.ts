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
} from "./image-prompt"
import { generateImage } from "./image-gen"
import { uploadBase64Image } from "@/lib/images/upload"

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
    const generated: Array<{ kind: "hero" | "inline"; index: number; url: string; altKo: string }> = []
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
        generated.push({ kind: p.kind, index: p.index, url: up.publicUrl, altKo: p.altKo })
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
    const updatePatch: Record<string, unknown> = { body_markdown: newBody }
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
