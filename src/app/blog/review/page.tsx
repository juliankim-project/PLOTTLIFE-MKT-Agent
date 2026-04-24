"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Icon, PageHeader } from "../_ui"

interface DraftLite {
  id: string
  title: string
  status: string
  progress_pct: number | null
  updated_at: string
  body_markdown?: string | null
  topic?: {
    primary_keyword?: string | null
  } | null
}

async function safeFetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const r = await fetch(input, init)
  const text = await r.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(r.ok ? "응답 파싱 실패" : `HTTP ${r.status}`)
  }
}

const CHECKS = [
  {
    cat: "SEO",
    items: [
      { l: "제목에 주요 키워드 포함", ok: true },
      { l: "메타 디스크립션 130~160자", ok: true },
      { l: "H1 → H2 → H3 구조 정합", ok: true },
      { l: "이미지 alt 속성 전체 입력", ok: false, m: "2개 누락" },
      { l: "내부 링크 3개 이상", ok: true },
    ],
  },
  {
    cat: "팩트·서비스 정확성",
    items: [
      { l: "수치·통계 출처 명시", ok: true },
      { l: "플라트 서비스 설명 최신성", ok: true },
      { l: "ARC·거주숙소제공확인서 절차 정확성", ok: false, m: "법무부 고시 2025 버전" },
      { l: "외국인 비자 명칭·약어 정확", ok: true },
    ],
  },
  {
    cat: "톤 & 브랜드",
    items: [
      { l: "플라트 보이스 일관성", ok: true },
      { l: "독자 기준 난이도", ok: true },
      { l: "금지어 / 민감 표현 필터", ok: true },
      { l: "CTA 매물 링크 자연스러운 배치", ok: true },
    ],
  },
]

export default function ReviewPage() {
  const router = useRouter()
  const [drafts, setDrafts] = useState<DraftLite[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const j = await safeFetchJson<{ ok: boolean; drafts?: DraftLite[] }>(
        "/api/drafts?status=drafting&limit=20",
        { cache: "no-store" }
      )
      const j2 = await safeFetchJson<{ ok: boolean; drafts?: DraftLite[] }>(
        "/api/drafts?status=reviewing&limit=20",
        { cache: "no-store" }
      )
      const combined = [...(j.drafts ?? []), ...(j2.drafts ?? [])].sort(
        (a, b) => b.updated_at.localeCompare(a.updated_at)
      )
      setDrafts(combined)
      if (combined.length > 0 && !selectedId) setSelectedId(combined[0].id)
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류")
    } finally {
      setLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    load()
  }, [load])

  const selected = drafts.find((d) => d.id === selectedId)

  const handleSave = async () => {
    if (!selectedId) return
    setSaving(true)
    setError(null)
    try {
      const j = await safeFetchJson<{ ok: boolean; error?: string }>(
        `/api/drafts/${selectedId}`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ status: "approved" }),
        }
      )
      if (!j.ok) throw new Error(j.error ?? "저장 실패")
      router.push("/blog/contents")
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패")
      setSaving(false)
    }
  }

  const total = CHECKS.flatMap((c) => c.items)
  const pass = total.filter((i) => i.ok).length

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 05 · REVIEW"
        title="검수"
        sub="SEO·팩트·서비스 정확성·플라트 보이스를 체크리스트로 교차검증합니다. 저장하면 콘텐츠 관리로 넘어갑니다."
        actions={[
          { label: "← 콘텐츠 제작", onClick: () => router.push("/blog/write") },
          {
            label: saving ? "저장 중…" : "💾 저장하기",
            primary: true,
            icon: "check",
            onClick: handleSave,
          },
        ]}
      />

      {error && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 14px",
            background: "var(--danger-bg)",
            border: "1px solid var(--danger-border)",
            color: "var(--danger-fg)",
            borderRadius: "var(--r-md)",
            fontSize: 13,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr 320px", gap: 14 }}>
        {/* LEFT: drafts 리스트 */}
        <div className="bcard">
          <div className="bcard__header">
            <div>
              <div className="bcard__title">검수 대상</div>
              <div className="bcard__sub">
                {loading ? "로드 중…" : `${drafts.length}개 작성 중`}
              </div>
            </div>
          </div>
          <div style={{ maxHeight: 520, overflowY: "auto" }}>
            {drafts.length === 0 && !loading && (
              <div
                style={{
                  padding: "32px 20px",
                  textAlign: "center",
                  fontSize: 12.5,
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                }}
              >
                검수할 초안이 없어요.
                <br />
                <Link href="/blog/write" style={{ color: "var(--brand-600)", fontWeight: 600 }}>
                  콘텐츠 제작
                </Link>
                에서 본문부터 작성해주세요.
              </div>
            )}
            {drafts.map((d) => {
              const on = selectedId === d.id
              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  style={{
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--border-subtle)",
                    cursor: "pointer",
                    background: on ? "var(--brand-50)" : "transparent",
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.35 }}>
                    {d.title}
                  </div>
                  <div
                    style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}
                  >
                    <span className="bchip" style={{ fontSize: 10 }}>
                      {d.status}
                    </span>
                    {d.progress_pct != null && (
                      <span className="bchip" style={{ fontSize: 10 }}>
                        {d.progress_pct}%
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CENTER: 체크리스트 */}
        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">체크리스트</div>
            <div
              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}
            >
              <div
                style={{
                  width: 120,
                  height: 6,
                  background: "var(--bg-muted)",
                  borderRadius: "var(--r-pill)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${(pass / total.length) * 100}%`,
                    height: "100%",
                    background: "var(--accent-emerald)",
                  }}
                />
              </div>
              <span className="text-mono" style={{ fontSize: 12, fontWeight: 700 }}>
                {pass}/{total.length}
              </span>
            </div>
          </div>
          {selected && (
            <div
              style={{
                padding: "12px 20px",
                background: "var(--bg-subtle)",
                borderBottom: "1px solid var(--border-subtle)",
                fontSize: 12.5,
              }}
            >
              <span style={{ color: "var(--text-muted)", fontWeight: 600 }}>대상:</span>{" "}
              <b>{selected.title}</b>
            </div>
          )}
          <div style={{ padding: "8px 20px 20px" }}>
            {CHECKS.map((g) => (
              <div key={g.cat} style={{ marginTop: 16 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: ".04em",
                    marginBottom: 10,
                  }}
                >
                  {g.cat}
                </div>
                {g.items.map((it, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 14px",
                      background: "var(--bg-subtle)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--r-md)",
                      marginBottom: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        background: it.ok ? "var(--success-bg)" : "var(--danger-bg)",
                        color: it.ok ? "var(--success-fg)" : "var(--danger-fg)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Icon
                        name={it.ok ? "check" : "plus"}
                        size={12}
                        stroke={3}
                        style={it.ok ? undefined : { transform: "rotate(45deg)" }}
                      />
                    </div>
                    <div style={{ flex: 1, fontSize: 13 }}>{it.l}</div>
                    {"m" in it && it.m && (
                      <span className="bchip bchip--danger">{it.m}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="bcard">
            <div className="bcard__body">
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>
                종합 스코어
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-.03em" }}>
                  {Math.round((pass / total.length) * 100)}
                </div>
                <div style={{ fontSize: 14, color: "var(--success-fg)", fontWeight: 600 }}>
                  / 100
                </div>
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--text-tertiary)",
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                저장하면 <b>콘텐츠 관리</b>에서 편집·발행할 수 있어요.
              </div>
            </div>
          </div>

          <button
            className="bbtn bbtn--primary bbtn--lg"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={handleSave}
            disabled={!selectedId || saving}
            title={!selectedId ? "검수할 초안을 선택하세요" : "승인 후 콘텐츠 관리로 이동"}
          >
            {saving ? "저장 중…" : "💾 저장하기 → 콘텐츠 관리"}
          </button>
        </div>
      </div>
    </div>
  )
}
