/**
 * Supabase Storage 업로드 helper.
 * blog-images 버킷에 draft-scoped 경로로 저장 후 public URL 반환.
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"

const BUCKET = "blog-images"

export interface UploadedImage {
  path: string
  publicUrl: string
  bytes: number
}

function extFromMime(mimeType: string): string {
  if (mimeType.includes("png")) return "png"
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return "jpg"
  if (mimeType.includes("webp")) return "webp"
  return "png"
}

export async function uploadBase64Image(args: {
  draftId: string
  slotName: string              // 'hero' | 'section-1' | 'section-2'
  base64: string
  mimeType: string
}): Promise<UploadedImage> {
  const { draftId, slotName, base64, mimeType } = args
  const ext = extFromMime(mimeType)
  const path = `${draftId}/${slotName}-${Date.now()}.${ext}`
  const buffer = Buffer.from(base64, "base64")

  const db = supabaseAdmin()
  const { error } = await db.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: true,
  })
  if (error) throw new Error(`storage upload failed: ${error.message}`)

  const { data } = db.storage.from(BUCKET).getPublicUrl(path)
  return {
    path,
    publicUrl: data.publicUrl,
    bytes: buffer.length,
  }
}

/** 드래프트에 붙은 이미지 전체 삭제 (draftId prefix 아래 전부) */
export async function deleteDraftImages(draftId: string) {
  const db = supabaseAdmin()
  const { data: list } = await db.storage.from(BUCKET).list(draftId)
  if (!list || list.length === 0) return
  const paths = list.map((f) => `${draftId}/${f.name}`)
  await db.storage.from(BUCKET).remove(paths)
}
