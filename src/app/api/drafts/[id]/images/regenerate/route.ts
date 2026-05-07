/**
 * POST /api/drafts/[id]/images/regenerate
 *
 * 단일 이미지 (hero 또는 inline 1장) 재생성.
 * Body: { kind: "hero" | "inline", index: number }
 *  - hero 면 index = 0
 *  - inline 이면 index = IMAGE_SLOT_n 의 n (1-based)
 *
 * 이미지가 한글 깨짐·간판 텍스트 등으로 어긋날 때 콘텐츠 페이지에서
 * 사용자가 직접 트리거. 매니페스트의 원본 prompt 를 reinforceSafePrompt
 * 로 한 번 더 정제해서 새로 생성.
 */

import { NextResponse } from "next/server"
import { regenerateSingleImage } from "@/lib/ai/image-pipeline"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

interface Body {
  kind?: "hero" | "inline"
  index?: number
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: draftId } = await params

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ ok: false, error: "잘못된 요청 본문" }, { status: 400 })
  }

  const kind = body.kind
  const index = body.index
  if (kind !== "hero" && kind !== "inline") {
    return NextResponse.json({ ok: false, error: "kind 는 'hero' 또는 'inline'" }, { status: 400 })
  }
  if (typeof index !== "number" || !Number.isFinite(index) || index < 0) {
    return NextResponse.json({ ok: false, error: "index 는 0 이상 정수" }, { status: 400 })
  }

  const result = await regenerateSingleImage({ draftId, kind, index })
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error ?? "재생성 실패" },
      { status: result.error?.includes("not found") ? 404 : 500 }
    )
  }
  return NextResponse.json({ ok: true, newUrl: result.newUrl })
}
