"use client"

import { usePathname } from "next/navigation"
import { useMemo } from "react"
import { STAGE_BY_ID, type StageId } from "../_lib/stages"
import { Icon } from "./index"

function resolveBreadcrumb(pathname: string): { crumb: string; title: string } {
  if (pathname === "/blog") return { crumb: "개요", title: "여정 맵" }
  const seg = pathname.replace(/^\/blog\//, "").split("/")[0] as StageId
  const stage = STAGE_BY_ID[seg]
  if (stage) {
    return { crumb: `${String(stage.order).padStart(2, "0")} · Stages`, title: stage.label }
  }
  return { crumb: "블로그 자동화", title: "" }
}

export function BlogTopbar() {
  const pathname = usePathname() ?? "/blog"
  const { crumb, title } = useMemo(() => resolveBreadcrumb(pathname), [pathname])

  return (
    <div className="bshell-topbar">
      <div className="bshell-topbar__crumb">
        블로그 자동화 · <strong>{crumb}</strong>
        {title && <> / {title}</>}
      </div>
      <div className="bshell-topbar__spacer" />
      <div className="bshell-topbar__search">
        <Icon name="search" size={14} />
        <input placeholder="주제·키워드·포스트 검색…" />
        <kbd>⌘K</kbd>
      </div>
      <button className="bbtn bbtn--ghost bbtn--sm">
        <Icon name="bolt" size={12} /> 자동화 로그
      </button>
      <button className="bbtn bbtn--primary bbtn--sm">
        <Icon name="plus" size={12} /> 새 프로젝트
      </button>
    </div>
  )
}
