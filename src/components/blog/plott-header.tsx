"use client"

import Link from "next/link"

export function PlottHeader() {
  return (
    <header className="sticky top-[41px] z-[5] border-b border-gray-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[min(100%-2rem,1024px)] items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#74594B]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 21V9l9-7 9 7v12h-6v-8h-6v8z" />
            </svg>
          </div>
          <span className="text-[17px] font-bold tracking-tight text-gray-900">
            plott <span className="font-medium text-[#74594B]">LIFE</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-gray-700 md:flex">
          <Link href="/" className="hover:text-[#74594B]">
            방 찾기
          </Link>
          <Link href="/" className="hover:text-[#74594B]">
            블로그
          </Link>
          <Link href="/" className="hover:text-[#74594B]">
            호스트 되기
          </Link>
          <Link href="/" className="hover:text-[#74594B]">
            FAQ
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <button className="hidden h-9 items-center rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50 sm:inline-flex">
            로그인
          </button>
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-md bg-[#74594B] px-3.5 text-sm font-medium text-white hover:bg-[#3d2b1f]"
          >
            방 둘러보기
          </Link>
        </div>
      </div>
    </header>
  )
}
