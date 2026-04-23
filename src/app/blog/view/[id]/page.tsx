"use client"

import { use, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useBlogContent, useBlogContents } from "@/lib/blog/store"
import { KPI_DEFINITIONS } from "@/lib/blog/schema"
import { MarkdownRenderer } from "@/components/blog/markdown-renderer"
import { PlottFooter } from "@/components/blog/plott-footer"
import { PlottHeader } from "@/components/blog/plott-header"

export default function BlogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const content = useBlogContent(id)
  const all = useBlogContents()

  // 사이드바와 간섭 방지 — body 스크롤만 사용
  useEffect(() => {
    document.documentElement.style.setProperty("--plott-viewing", "1")
    return () => {
      document.documentElement.style.removeProperty("--plott-viewing")
    }
  }, [])

  if (!content) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600">콘텐츠를 찾을 수 없습니다.</p>
          <Link href="/blog/manager" className="mt-4 inline-block text-[#74594B] hover:underline">
            ← 콘텐츠 매니저로
          </Link>
        </div>
      </div>
    )
  }

  const kpiDef = KPI_DEFINITIONS[content.target_kpi]
  const related = all
    .filter(
      (c) => c.id !== content.id && c.status === "published" && c.target_kpi === content.target_kpi
    )
    .slice(0, 3)

  const body = content.body_markdown?.trim() || "_아직 본문이 작성되지 않았습니다. 드래프트에서 본문을 생성해주세요._"
  const wordCount = body.length
  const readingTime = Math.max(3, Math.round(wordCount / 500))

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-white">
      {/* Top preview bar — 관리자용 */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-amber-50/90 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-xs text-amber-900">
          <span className="inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 font-semibold">
            🔍 미리보기 모드
          </span>
          <span className="hidden sm:inline">관리자 뷰 · 실제 발행 화면과 동일합니다</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/blog/drafts/${content.id}`}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            ✎ 편집
          </Link>
          <button
            onClick={() => router.back()}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            ✕ 닫기
          </button>
        </div>
      </div>

      <PlottHeader />

      {/* Hero */}
      <section className="border-b border-gray-100 bg-[#f5f0e5]/30 py-10">
        <div className="mx-auto max-w-[min(100%-2rem,1024px)]">
          <nav className="mb-4 flex items-center gap-1.5 text-[12px] text-gray-500">
            <Link href="/" className="hover:text-[#74594B]">
              홈
            </Link>
            <span>›</span>
            <span>블로그</span>
            <span>›</span>
            <span className="text-gray-700">{kpiDef.label}</span>
          </nav>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-[3px] bg-[#f5f0e5] px-2 py-[3px] text-[12px] font-medium text-[#74594B]">
              {kpiDef.icon} {content.content_type === "region-guide"
                ? "지역 가이드"
                : content.content_type === "lifestyle"
                ? "라이프스타일"
                : content.content_type === "guest-story"
                ? "게스트 스토리"
                : content.content_type === "host-story"
                ? "호스트 스토리"
                : content.content_type === "seo-longtail"
                ? "단기임대 가이드"
                : "제휴"}
            </span>
            {content.target_audience && (
              <span className="rounded-[3px] bg-white border border-gray-200 px-2 py-[3px] text-[12px] text-gray-600">
                {content.target_audience}
              </span>
            )}
          </div>

          <h1 className="text-[32px] leading-tight font-bold tracking-tight text-gray-900 sm:text-[36px]">
            {content.title}
          </h1>

          <div className="mt-5 flex items-center gap-3 text-[13px] text-gray-500">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-[#74594B] flex items-center justify-center text-white text-[11px] font-bold">
                PL
              </div>
              <div>
                <p className="font-medium text-gray-700">plott LIFE 에디토리얼</p>
                <p className="text-[11px] text-gray-400">
                  {content.published_at
                    ? new Date(content.published_at).toLocaleDateString("ko-KR", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "발행 예정"}
                  {" · "}
                  {readingTime}분 읽기
                </p>
              </div>
            </div>
            {content.metrics && content.status === "published" && (
              <>
                <span className="text-gray-300">|</span>
                <span>👁️ {content.metrics.page_views.toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="py-10">
        <div className="mx-auto max-w-[min(100%-2rem,720px)]">
          <MarkdownRenderer content={body} />

          {/* Tags */}
          <div className="mt-12 flex flex-wrap items-center gap-2 border-t border-gray-200 pt-6">
            <span className="text-[13px] text-gray-500">관련 태그</span>
            <span className="rounded-[3px] bg-[#f5f0e5] px-2 py-[3px] text-[12px] text-[#74594B]">
              #{content.primary_keyword}
            </span>
            {content.secondary_keywords.map((k) => (
              <span
                key={k}
                className="rounded-[3px] bg-[#f5f0e5] px-2 py-[3px] text-[12px] text-[#74594B]"
              >
                #{k}
              </span>
            ))}
          </div>

          {/* Author card */}
          <div
            className="mt-10 rounded-xl border border-gray-200 bg-white p-6"
            style={{ boxShadow: "0 5px 20px 0 rgba(0,0,0,0.08)" }}
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 shrink-0 rounded-full bg-[#74594B] flex items-center justify-center text-white font-bold">
                PL
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-900">plott LIFE 에디토리얼 팀</p>
                <p className="mt-1 text-sm text-gray-600">
                  한국에서 가장 쉬운 단기임대 방 찾기. 유학생·출장자·한달살기 여행자를 위한 검증된
                  매물과 실용적인 정보를 전합니다.
                </p>
                <div className="mt-3 flex gap-2">
                  <Link
                    href="/"
                    className="inline-flex h-9 items-center rounded-md bg-[#74594B] px-4 text-sm font-medium text-white hover:bg-[#3d2b1f]"
                  >
                    방 둘러보기
                  </Link>
                  <button className="inline-flex h-9 items-center rounded-md border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    뉴스레터 구독
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="border-t border-gray-100 bg-[#f5f0e5]/20 py-10">
          <div className="mx-auto max-w-[min(100%-2rem,1024px)]">
            <h2 className="text-[22px] font-bold text-gray-900">비슷한 이야기 더 보기</h2>
            <p className="mt-1 text-[13px] text-gray-500">
              {kpiDef.label} 카테고리의 다른 글
            </p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/blog/view/${r.id}`}
                  className="group overflow-hidden rounded-xl border border-gray-200 bg-white transition-shadow hover:shadow-md"
                  style={{ boxShadow: "0 5px 20px 0 rgba(0,0,0,0.06)" }}
                >
                  <div className="aspect-[16/9] bg-[#f5f0e5]">
                    <img
                      src={`https://placehold.co/800x450/74594b/fff?text=${encodeURIComponent(r.title.slice(0, 20))}`}
                      alt={r.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <span className="rounded-[3px] bg-[#f5f0e5] px-1.5 py-[3px] text-[11px] text-[#74594B]">
                      {KPI_DEFINITIONS[r.target_kpi].label}
                    </span>
                    <h3 className="mt-2 line-clamp-2 font-semibold text-gray-900 group-hover:text-[#74594B]">
                      {r.title}
                    </h3>
                    <p className="mt-2 text-[12px] text-gray-500">
                      {r.published_at
                        ? new Date(r.published_at).toLocaleDateString("ko-KR")
                        : ""}
                      {r.metrics && ` · 👁️ ${r.metrics.page_views.toLocaleString()}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Bottom CTA */}
      <section className="bg-[#74594B] py-12">
        <div className="mx-auto max-w-[min(100%-2rem,720px)] text-center">
          <h2 className="text-[24px] font-bold text-white">
            마음에 드는 방을 찾으셨나요?
          </h2>
          <p className="mt-2 text-[15px] text-white/85">
            1주~20주 단위 풀옵션 단기임대. 보증금 없는 옵션부터 ARC 서류 발급까지.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-md bg-white px-6 text-sm font-semibold text-[#74594B] hover:bg-gray-50"
            >
              방 둘러보기
            </Link>
            <button className="inline-flex h-10 items-center rounded-md border border-white/30 bg-transparent px-6 text-sm font-medium text-white hover:bg-white/10">
              카카오톡 문의
            </button>
          </div>
        </div>
      </section>

      <PlottFooter />
    </div>
  )
}
