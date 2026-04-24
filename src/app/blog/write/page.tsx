"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Icon, PageHeader } from "../_ui"

interface TopicItem {
  id: string
  title: string
  primary_keyword: string | null
  target_kpi: string | null
  status: string
  finalized_at: string | null
  created_at: string
}

interface DraftItem {
  id: string
  topic_id: string | null
  title: string
  status: string
  progress_pct: number | null
  updated_at: string
}

async function safeFetchJson<T>(input: RequestInfo): Promise<T> {
  const r = await fetch(input, { cache: "no-store" })
  const text = await r.text()
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(r.ok ? "응답 파싱 실패" : `HTTP ${r.status}`)
  }
}

export default function WriteListPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<TopicItem[]>([])
  const [drafts, setDrafts] = useState<DraftItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [t, d] = await Promise.all([
        safeFetchJson<{ ok: boolean; topics?: TopicItem[] }>("/api/topics?limit=50"),
        safeFetchJson<{ ok: boolean; drafts?: DraftItem[] }>("/api/drafts?limit=50"),
      ])
      setTopics(t.topics ?? [])
      setDrafts(d.drafts ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const draftByTopic = new Map(drafts.filter((d) => d.topic_id).map((d) => [d.topic_id, d]))

  const approved = topics.filter((t) => t.status === "approved")
  const drafted = topics.filter((t) => t.status === "draft")

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 04 · CREATE"
        title="콘텐츠 제작"
        sub="브리프 작성에서 확정된 브리프 1개를 선택하면 Copywriter 에이전트가 플라트 블로그 스타일로 본문을 작성합니다."
        actions={[
          { label: "← 브리프 작성", onClick: () => router.push("/blog/topics") },
          { label: "검수로 →", primary: true, onClick: () => router.push("/blog/review") },
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

      <div className="bcard">
        <div className="bcard__header">
          <div>
            <div className="bcard__title">확정된 주제 · 작성 대기</div>
            <div className="bcard__sub">
              {loading ? "불러오는 중…" : `${approved.length}개 확정 / ${drafted.length}개 초안 브리프`}
            </div>
          </div>
          <Link href="/blog/topics" className="bbtn bbtn--ghost bbtn--sm" style={{ marginLeft: "auto" }}>
            <Icon name="target" size={12} /> 브리프 작성으로
          </Link>
        </div>

        <div>
          {approved.length === 0 && drafted.length === 0 && !loading && (
            <div
              style={{
                padding: "40px 24px",
                textAlign: "center",
                fontSize: 13,
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.5 }}>✍️</div>
              아직 확정된 주제가 없어요.
              <br />
              먼저{" "}
              <Link href="/blog/topics" style={{ color: "var(--brand-600)", fontWeight: 600 }}>
                브리프 작성
              </Link>
              에서 브리프를 만들고 확정해주세요.
            </div>
          )}

          {[...approved, ...drafted].map((t) => {
            const draft = draftByTopic.get(t.id)
            const hasDraft = draft && draft.progress_pct != null
            return (
              <Link
                key={t.id}
                href={`/blog/write/${t.id}`}
                style={{
                  display: "flex",
                  padding: "14px 20px",
                  borderBottom: "1px solid var(--border-subtle)",
                  alignItems: "center",
                  gap: 12,
                  color: "inherit",
                  textDecoration: "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{t.title}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {t.primary_keyword && <span className="bchip bchip--brand">#{t.primary_keyword}</span>}
                    {t.target_kpi && <span className="bchip">{t.target_kpi}</span>}
                    <span
                      className={`bchip ${
                        t.status === "approved" ? "bchip--success" : ""
                      }`}
                    >
                      {t.status === "approved" ? "✓ 확정" : "초안 브리프"}
                    </span>
                  </div>
                </div>
                {hasDraft ? (
                  <div style={{ minWidth: 200 }}>
                    <div className="bar-track" style={{ height: 4 }}>
                      <div className="bar-fill" style={{ width: `${draft!.progress_pct ?? 0}%` }} />
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 4,
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{draft!.status}</span>
                      <span className="text-mono">{draft!.progress_pct ?? 0}%</span>
                    </div>
                  </div>
                ) : (
                  <span className="bbtn bbtn--primary bbtn--sm">
                    <Icon name="sparkles" size={12} /> 작성 시작
                  </span>
                )}
                <Icon name="chevron" size={14} />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
