import { NextResponse } from "next/server"
import { generateImagesForDraft } from "@/lib/ai/image-pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

/**
 * POST /api/drafts/[id]/images
 * draft 의 IMAGE_SLOT 주석을 실제 이미지 URL 로 치환 + hero_image 생성.
 * 핵심 로직은 image-pipeline.ts 에 있음 (자동화에서도 재사용).
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: draftId } = await params

  const result = await generateImagesForDraft(draftId)

  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? "이미지 생성 실패",
        failures: result.failures,
      },
      { status: result.error?.includes("not found") ? 404 : 500 }
    )
  }

  return NextResponse.json({
    ok: true,
    result: {
      heroUrl: result.heroUrl,
      inline: result.inline,
      replacedSlots: result.replacedSlots,
      ...(result.failures && result.failures.length > 0
        ? { partialFailures: result.failures }
        : {}),
    },
  })
}
