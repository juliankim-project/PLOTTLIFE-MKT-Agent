import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase/server"
import {
  extractImageSlots,
  replaceSlotsWithImages,
  buildImagePrompts,
} from "@/lib/ai/image-prompt"
import { generateImage } from "@/lib/ai/image-gen"
import { uploadBase64Image } from "@/lib/images/upload"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * POST /api/drafts/[id]/images
 * body_markdown 의 IMAGE_SLOT 주석을 실제 이미지 URL로 치환 + hero_image 생성.
 * 1) 기존 draft 로드
 * 2) Creative Designer 로 영문 prompt 3종(hero + inline 2) 생성
 * 3) Gemini Image 로 3장 생성
 * 4) Supabase Storage 업로드
 * 5) body_markdown 치환 + hero_image_url 업데이트
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: draftId } = await params
  const db = supabaseAdmin()

  // 1. draft + topic 로드
  const { data: draft, error: draftErr } = await db
    .from("drafts")
    .select("id, project_id, topic_id, title, body_markdown, hero_image_url, persona_id")
    .eq("id", draftId)
    .single()
  if (draftErr || !draft) {
    return NextResponse.json({ ok: false, error: "draft not found" }, { status: 404 })
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
    // 2. 이미지 프롬프트 생성 (hero + inline slots)
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

    // 3-4. 이미지 생성 + 업로드 (순차 — rate limit 여유)
    const generated: Array<{ kind: "hero" | "inline"; index: number; url: string; altKo: string }> = []
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
        console.warn(`[images] slot ${p.kind}-${p.index} 실패:`, e instanceof Error ? e.message : e)
      }
    }

    if (generated.length === 0) {
      return NextResponse.json(
        { ok: false, error: "이미지 생성 실패 — Gemini Image quota / 결제 확인 필요" },
        { status: 500 }
      )
    }

    // 5. body 치환 + hero 저장
    const heroImg = generated.find((g) => g.kind === "hero")
    const inlineImgs = generated.filter((g) => g.kind === "inline")

    const mapping = inlineImgs.map((g) => {
      const slot = slots.find((s) => s.index === g.index)
      return {
        slotIndex: g.index,
        url: g.url,
        alt: g.altKo,
        raw: slot?.raw ?? "",
      }
    }).filter((m) => m.raw)

    const newBody = replaceSlotsWithImages(body, mapping)

    const updatePatch: Record<string, unknown> = {
      body_markdown: newBody,
    }
    if (heroImg) updatePatch.hero_image_url = heroImg.url

    await db.from("drafts").update(updatePatch).eq("id", draftId)

    return NextResponse.json({
      ok: true,
      result: {
        heroUrl: heroImg?.url ?? null,
        inline: inlineImgs,
        replacedSlots: mapping.length,
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
