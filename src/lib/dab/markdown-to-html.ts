/**
 * Markdown → HTML — 우리 drafts.body_markdown 을 대브 어드민의 HTML content 로 변환.
 *
 * marked + GFM 으로 표·체크리스트·표준 마크다운 처리.
 * Writer 가 만드는 모든 요소(콜아웃/표/체크리스트/이미지/구분선) 가 표준 HTML 로 변환됨.
 *
 * Tiptap 에디터(블로그 에디터) 에서 사용하는 표준 HTML 마크업과 호환.
 */

import { marked } from "marked"

/* GFM 활성화 — 표·체크리스트·취소선 지원 */
marked.use({
  gfm: true,
  breaks: false,    // 단순 줄바꿈을 <br> 로 변환하지 않음 (Tiptap 표준)
})

/**
 * Markdown 본문을 HTML 문자열로 변환.
 * - IMAGE_SLOT 주석이 남아있으면 제거 (발행 단계에서는 실제 이미지로 치환됐어야 함)
 * - "참고 출처" 섹션은 그대로 유지 (Phase 1 에서 클릭 불가 텍스트로 처리됨)
 * - 결과는 Tiptap 호환 HTML
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown || markdown.trim().length === 0) return ""

  /* 혹시 남은 IMAGE_SLOT 주석은 제거 (HTML 주석으로 흘러가지 않게) */
  const cleaned = markdown.replace(/<!--\s*IMAGE_SLOT_\d+\s*:[^>]*-->/g, "")

  const html = marked.parse(cleaned, { async: false }) as string
  return html.trim()
}

/**
 * 첫 H2(##) 이전의 도입부(서론·H1 제목 등) 를 본문에서 제거.
 *
 * 대브 어드민은 summary 필드를 본문 위에 따로 노출하므로,
 * 도입부가 본문에 그대로 남아있으면 같은 내용이 두 번 보임.
 * 이 함수로 H2 이전 부분을 잘라내고 첫 H2 부터 본문으로 사용.
 *
 * - H2 가 하나도 없으면 markdown 그대로 반환 (안전).
 */
export function stripIntroBeforeFirstH2(markdown: string): string {
  if (!markdown) return ""
  const re = /^##\s+/m
  const match = re.exec(markdown)
  if (!match || match.index === undefined) return markdown
  return markdown.slice(match.index).trim()
}

/**
 * 본문 첫 문단(서론)을 평문으로 추출 — 대브 schema 의 `summary` 필드용.
 * - 첫 H2 이전의 단락 텍스트
 * - 마크다운 기호 제거 (**, *, `, [text](url) → text)
 * - 최대 200자
 */
export function extractSummary(markdown: string): string {
  if (!markdown) return ""

  /* 첫 H2(##) 이전까지를 도입부로 */
  const beforeH2 = markdown.split(/^##\s+/m)[0]
  /* IMAGE_SLOT 주석·구분선 제거 */
  const cleaned = beforeH2
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/^---+$/gm, "")
    .replace(/^\s*[-*]\s+/gm, "") // 리스트 마커 제거
    .trim()

  /* 마크다운 기호 → 평문 */
  const plain = cleaned
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")          // 이미지 제거
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")          // [text](url) → text
    .replace(/\*\*([^*]+)\*\*/g, "$1")                // **bold** → bold
    .replace(/\*([^*]+)\*/g, "$1")                    // *italic* → italic
    .replace(/`([^`]+)`/g, "$1")                      // `code` → code
    .replace(/\s+/g, " ")
    .trim()

  if (plain.length <= 200) return plain
  /* 200자 근처에서 문장 경계로 자르기 */
  const cut = plain.slice(0, 200)
  const lastPeriod = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("。"), cut.lastIndexOf("요"))
  return (lastPeriod > 100 ? cut.slice(0, lastPeriod + 1) : cut) + "…"
}
