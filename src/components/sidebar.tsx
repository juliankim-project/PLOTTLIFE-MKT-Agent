"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

type NavLeaf = {
  kind: "leaf"
  label: string
  href: string
  icon?: React.ReactNode
}

type NavGroup = {
  kind: "group"
  label: string
  href?: string // 옵션: 그룹 자체도 클릭 가능 (홈 페이지)
  icon?: React.ReactNode
  match: (pathname: string) => boolean // 자식 중 하나라도 활성이면 true
  items: NavLeaf[]
}

type NavItem = NavLeaf | NavGroup

// ── Icons ─────────────────────────────────────────
const Icon = {
  home: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  board: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  ),
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
  blog: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3v4a1 1 0 0 0 1 1h4" /><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z" />
      <path d="M9 13h6" /><path d="M9 17h6" />
    </svg>
  ),
  insta: (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  chevron: (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
}

// ── Navigation Definition ─────────────────────────
const navItems: NavItem[] = [
  { kind: "leaf", label: "Agent List", href: "/", icon: Icon.home },
  {
    kind: "group",
    label: "블로그 파이프라인",
    href: "/blog",
    icon: Icon.blog,
    match: (p) => p.startsWith("/blog"),
    items: [
      { kind: "leaf", label: "여정 맵", href: "/blog" },
      { kind: "leaf", label: "01 · 키워드 트렌드", href: "/blog/research" },
      { kind: "leaf", label: "02 · 아이데이션", href: "/blog/ideation" },
      { kind: "leaf", label: "03 · 브리프 작성", href: "/blog/topics" },
      { kind: "leaf", label: "04 · 콘텐츠 제작", href: "/blog/write" },
      { kind: "leaf", label: "05 · 검수", href: "/blog/review" },
      { kind: "leaf", label: "06 · 콘텐츠 관리", href: "/blog/contents" },
      { kind: "leaf", label: "07 · 발행관리", href: "/blog/publish" },
      { kind: "leaf", label: "08 · 성과분석", href: "/blog/analyze" },
    ],
  },
  {
    kind: "group",
    label: "인스타 파이프라인",
    href: "/insta",
    icon: Icon.insta,
    match: (p) => p.startsWith("/insta"),
    items: [
      { kind: "leaf", label: "여정 맵", href: "/insta" },
      { kind: "leaf", label: "01 · 트렌드·해시태그", href: "/insta/trends" },
      { kind: "leaf", label: "02 · 포스트 아이데이션", href: "/insta/ideation" },
      { kind: "leaf", label: "03 · 포스트 브리프", href: "/insta/topics" },
      { kind: "leaf", label: "04 · 카드 제작", href: "/insta/posts" },
      { kind: "leaf", label: "05 · 검수", href: "/insta/review" },
      { kind: "leaf", label: "06 · 콘텐츠 관리", href: "/insta/contents" },
      { kind: "leaf", label: "07 · 발행관리", href: "/insta/publish" },
      { kind: "leaf", label: "08 · 성과분석", href: "/insta/analyze" },
    ],
  },
]

// ── Exact match for active state (중복 방지) ──────────
function isExactActive(pathname: string, href: string) {
  // 작성 단계의 상세 편집 (/blog/drafts/[id])도 작성 탭에 매칭
  if (href === "/blog/write")
    return pathname === "/blog/write" || pathname.startsWith("/blog/drafts/")
  if (href === "/blog/view") return pathname.startsWith("/blog/view/")
  return pathname === href
}

export function Sidebar() {
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  // 현재 경로가 속한 그룹은 자동 확장
  useEffect(() => {
    const next: Record<string, boolean> = {}
    for (const item of navItems) {
      if (item.kind === "group" && item.match(pathname)) {
        next[item.label] = true
      }
    }
    setOpenGroups((prev) => ({ ...prev, ...next }))
  }, [pathname])

  function toggle(label: string) {
    setOpenGroups((s) => ({ ...s, [label]: !s[label] }))
  }

  return (
    <aside className="w-60 border-r bg-background flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="p-5 border-b">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-sm">Plott LIFE MKT</h1>
            <p className="text-[11px] text-muted-foreground">Agent Dashboard</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            if (item.kind === "leaf") {
              const active = isExactActive(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                      active
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                </li>
              )
            }

            // Group
            const isOpen = openGroups[item.label] ?? item.match(pathname)
            const groupActive = item.match(pathname)

            return (
              <li key={item.label}>
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-lg text-sm transition-colors",
                    groupActive
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  <button
                    onClick={() => toggle(item.label)}
                    className={cn(
                      "p-2 rounded-md hover:bg-accent transition-transform shrink-0",
                      isOpen && "rotate-90"
                    )}
                    aria-label={isOpen ? "접기" : "펼치기"}
                  >
                    {Icon.chevron}
                  </button>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-1 py-2 rounded-md hover:bg-accent hover:text-foreground",
                        groupActive && "font-semibold"
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => toggle(item.label)}
                      className={cn(
                        "flex-1 flex items-center gap-2 px-1 py-2 rounded-md hover:bg-accent hover:text-foreground text-left",
                        groupActive && "font-semibold"
                      )}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  )}
                </div>

                {/* Sub items */}
                {isOpen && (
                  <ul className="mt-0.5 ml-6 space-y-0.5 border-l border-border pl-2">
                    {item.items.map((sub) => {
                      const active = isExactActive(pathname, sub.href)
                      return (
                        <li key={sub.href}>
                          <Link
                            href={sub.href}
                            className={cn(
                              "flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs transition-colors",
                              active
                                ? "bg-primary/10 text-primary font-medium"
                                : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                          >
                            {sub.label}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>8명 에이전트 활동 중</span>
        </div>
      </div>
    </aside>
  )
}
