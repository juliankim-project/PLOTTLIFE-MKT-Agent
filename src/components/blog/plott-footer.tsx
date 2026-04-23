"use client"

import Link from "next/link"

export function PlottFooter() {
  return (
    <footer className="border-t border-gray-200 bg-[#faf8f5]">
      <div className="mx-auto max-w-[min(100%-2rem,1024px)] py-12">
        {/* Top — brand + columns */}
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#74594B]">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 21V9l9-7 9 7v12h-6v-8h-6v8z" />
                </svg>
              </div>
              <span className="text-[17px] font-bold tracking-tight text-gray-900">
                plott <span className="font-medium text-[#74594B]">LIFE</span>
              </span>
            </Link>
            <p className="mt-3 text-[13px] leading-relaxed text-gray-600">
              한국에서 가장 쉬운 단기임대 방 찾기.
              <br />
              유학생·출장자·한달살기 전용.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <SocialIcon label="Instagram" href="#" path="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              <SocialIcon label="Facebook" href="#" path="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              <SocialIcon label="YouTube" href="#" path="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </div>
          </div>

          {/* Columns */}
          <FooterColumn
            title="서비스"
            links={[
              { label: "방 찾기", href: "/" },
              { label: "즉시 계약", href: "/" },
              { label: "보증금 없는 방", href: "/" },
              { label: "장기 할인", href: "/" },
            ]}
          />

          <FooterColumn
            title="외국인 전용"
            links={[
              { label: "ARC 발급 가이드", href: "/" },
              { label: "English", href: "/" },
              { label: "中文", href: "/" },
              { label: "Tiếng Việt", href: "/" },
              { label: "日本語", href: "/" },
            ]}
          />

          <FooterColumn
            title="고객지원"
            links={[
              { label: "자주 묻는 질문", href: "/" },
              { label: "카카오톡 상담", href: "/" },
              { label: "블로그", href: "/" },
              { label: "공지사항", href: "/" },
              { label: "호스트 되기", href: "/" },
            ]}
          />
        </div>

        {/* Newsletter */}
        <div className="mt-10 rounded-xl border border-gray-200 bg-white p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[15px] font-bold text-gray-900">매주 신규 매물 + 지역 인사이트</p>
              <p className="mt-0.5 text-[13px] text-gray-600">
                뉴스레터 구독 시 첫 결제 5% 할인 쿠폰을 드려요
              </p>
            </div>
            <form className="flex w-full gap-2 sm:w-auto">
              <input
                type="email"
                placeholder="이메일 주소"
                className="h-9 flex-1 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm outline-none focus:border-[#74594B] focus:ring-2 focus:ring-[#74594B]/20 sm:w-64"
              />
              <button
                type="button"
                className="h-9 rounded-md bg-[#74594B] px-4 text-sm font-medium text-white hover:bg-[#3d2b1f]"
              >
                구독
              </button>
            </form>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 flex flex-col items-start gap-4 border-t border-gray-200 pt-6 text-[12px] text-gray-500 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p>
              <span className="font-semibold text-gray-700">plott LIFE Inc.</span>
              {" · "}
              대표: 홍길동 · 사업자등록번호: 123-45-67890
            </p>
            <p>
              통신판매업신고: 2026-서울강남-0001 · 서울특별시 강남구 테헤란로 123, 10층
            </p>
            <p>
              고객센터 10:00–18:00 (평일) · hello@plottlife.com
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/" className="hover:text-[#74594B]">이용약관</Link>
            <Link href="/" className="font-semibold text-gray-700 hover:text-[#74594B]">
              개인정보처리방침
            </Link>
            <Link href="/" className="hover:text-[#74594B]">운영정책</Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-400">
          © 2026 plott LIFE Inc. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

function FooterColumn({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <p className="text-[13px] font-bold text-gray-900">{title}</p>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.label}>
            <Link href={l.href} className="text-[13px] text-gray-600 hover:text-[#74594B]">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function SocialIcon({ label, href, path }: { label: string; href: string; path: string }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 hover:border-[#74594B] hover:text-[#74594B]"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d={path} />
      </svg>
    </a>
  )
}
