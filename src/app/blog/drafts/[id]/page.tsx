"use client"

import { useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AdminPageHeader, AdminCard, StatusBadge } from "@/components/blog/admin-components"
import { KPIBadge } from "@/components/blog/kpi-badge"
import { AgentChip } from "@/components/blog/agent-chip"
import { useBlogContent, blogStore } from "@/lib/blog/store"
import { generateOutline, generateFullDraft } from "@/lib/blog/mock-llm"
import { runCopywriting, runPsychology } from "@/lib/blog/agent-runner"
import { KPI_PROMPT_STRATEGIES } from "@/lib/blog/kpi-strategies"
import { KPI_DEFINITIONS } from "@/lib/blog/schema"
import { cn } from "@/lib/utils"

export default function DraftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const content = useBlogContent(id)
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [draftBody, setDraftBody] = useState(content?.body_markdown ?? "")
  const [confirmPublish, setConfirmPublish] = useState(false)
  const [aiPanel, setAiPanel] = useState<"haru" | "psyche" | null>(null)

  if (!content) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">콘텐츠를 찾을 수 없습니다.</p>
        <Link href="/blog/drafts" className="text-sm text-[#74594b] hover:underline">
          ← 드래프트 목록
        </Link>
      </div>
    )
  }

  const c = content
  const strategy = KPI_PROMPT_STRATEGIES[c.target_kpi]
  const kpiDef = KPI_DEFINITIONS[c.target_kpi]
  const outline = c.outline
  const totalChecks = strategy.optimization_checklist.length
  const passedChecks = checked.size
  const allChecksDone = passedChecks === totalChecks

  function genOutline() {
    const result = generateOutline(c.title, c.target_kpi, c.primary_keyword)
    blogStore.update(c.id, {
      outline: result,
      status: c.status === "idea" ? "drafting" : c.status,
    })
  }

  function genDraft() {
    if (outline.length === 0) return
    const body = generateFullDraft({ ...c, outline })
    setDraftBody(body)
    blogStore.update(c.id, { body_markdown: body, status: "drafting" })
  }

  function saveDraft() {
    blogStore.update(c.id, { body_markdown: draftBody })
  }

  function sendToReview() {
    saveDraft()
    blogStore.setStatus(c.id, "reviewing")
  }

  function publish() {
    saveDraft()
    blogStore.publish(c.id)
    setConfirmPublish(false)
    router.push("/blog/manager")
  }

  function toggleCheck(i: number) {
    const next = new Set(checked)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    setChecked(next)
  }

  const canPublish =
    (c.status === "drafting" || c.status === "reviewing" || c.status === "rewriting") &&
    draftBody.trim().length > 50

  const copy = aiPanel === "haru" ? runCopywriting(c) : null
  const psych = aiPanel === "psyche" ? runPsychology(c) : null

  return (
    <div className="p-4 space-y-4">
      <Link
        href="/blog/drafts"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        ← 드래프트 목록
      </Link>

      <AdminPageHeader
        title={c.title}
        description={`${c.primary_keyword} · ${c.target_audience}`}
        badges={
          <div className="flex items-center gap-1.5">
            <KPIBadge kpi={c.target_kpi} size="sm" />
            <StatusBadge status={c.status} size="sm" />
          </div>
        }
      />

      {/* Action bar */}
      <AdminCard padded={false}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              체크: <strong className={allChecksDone ? "text-emerald-600" : "text-foreground"}>{passedChecks}/{totalChecks}</strong>
            </span>
            <span>·</span>
            <span>본문: {draftBody.length.toLocaleString()}자</span>
            {c.published_at && (
              <>
                <span>·</span>
                <span>
                  발행: <strong className="text-emerald-600">{new Date(c.published_at).toLocaleString("ko-KR")}</strong>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            {c.status !== "published" && (
              <>
                <button
                  onClick={saveDraft}
                  className="h-8 rounded-md border px-3 text-xs hover:bg-accent"
                >
                  💾 저장
                </button>
                {c.status !== "reviewing" && (
                  <button
                    onClick={sendToReview}
                    className="h-8 rounded-md border px-3 text-xs hover:bg-accent"
                  >
                    📋 검수 요청
                  </button>
                )}
                <button
                  onClick={() => setConfirmPublish(true)}
                  disabled={!canPublish}
                  className={cn(
                    "h-8 rounded-md px-3 text-xs font-semibold",
                    canPublish
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  🚀 발행
                </button>
              </>
            )}
            {c.status === "published" && (
              <button
                onClick={() => blogStore.unpublish(c.id)}
                className="h-8 rounded-md border border-red-200 bg-red-50 px-3 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                ↩ 발행 취소
              </button>
            )}
          </div>
        </div>
      </AdminCard>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4">
        {/* Left: Outline + Draft */}
        <div className="space-y-4">
          {/* Outline */}
          <AdminCard
            title="1. 아웃라인"
            description="하루가 작성 · 스트래 브리프 기반"
            headerAction={
              <div className="flex items-center gap-2">
                <AgentChip agentId="stra" size="xs" />
                <button
                  onClick={genOutline}
                  className="h-7 rounded-md bg-[#74594b] px-2.5 text-xs text-white hover:opacity-90"
                >
                  {outline.length > 0 ? "🔄 재생성" : "✨ 생성"}
                </button>
              </div>
            }
          >
            {outline.length === 0 ? (
              <p className="rounded-md bg-muted/40 p-4 text-center text-xs text-muted-foreground">
                "생성"을 눌러 {kpiDef.label} 최적화 아웃라인을 받으세요
              </p>
            ) : (
              <div className="space-y-2">
                {outline.map((s, i) => (
                  <div key={i} className="rounded-md border p-3">
                    <p className="text-sm font-semibold">
                      {i + 1}. {s.heading}
                    </p>
                    <ul className="list-disc list-inside mt-1 text-xs text-muted-foreground space-y-0.5">
                      {s.bullets.map((b, bi) => (
                        <li key={bi}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>

          {/* Draft editor */}
          <AdminCard
            title="2. 본문"
            description="Markdown 편집 · AI 에이전트 지원"
            headerAction={
              <div className="flex items-center gap-2">
                <AgentChip agentId="haru" size="xs" />
                <button
                  onClick={genDraft}
                  disabled={outline.length === 0}
                  className="h-7 rounded-md bg-[#74594b] px-2.5 text-xs text-white hover:opacity-90 disabled:opacity-50"
                >
                  ✨ AI 드래프트
                </button>
              </div>
            }
          >
            {/* AI assist toolbar */}
            <div className="flex items-center gap-2 mb-2 rounded-md border bg-muted/30 px-2 py-1.5 text-xs">
              <span className="text-muted-foreground shrink-0">AI 편집:</span>
              <button
                onClick={() => setAiPanel(aiPanel === "haru" ? null : "haru")}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-1 transition-colors",
                  aiPanel === "haru"
                    ? "bg-[#F97316]/10 text-[#F97316]"
                    : "hover:bg-accent"
                )}
              >
                ✍️ 하루 · 카피 대안
              </button>
              <button
                onClick={() => setAiPanel(aiPanel === "psyche" ? null : "psyche")}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-2 py-1 transition-colors",
                  aiPanel === "psyche"
                    ? "bg-[#8B5CF6]/10 text-[#8B5CF6]"
                    : "hover:bg-accent"
                )}
              >
                🧠 심리 · CTA 레버
              </button>
            </div>

            {/* AI assist panel */}
            {copy && (
              <div className="mb-3 rounded-md border border-[#F97316]/20 bg-[#FFF7ED] p-3 text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <AgentChip agentId="haru" size="xs" />
                  <span className="font-semibold">헤드라인 대안</span>
                </div>
                <ul className="space-y-1">
                  {copy.headlines.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-muted-foreground">{i + 1}.</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 pt-2 border-t border-[#F97316]/20">
                  <p className="text-muted-foreground mb-1">리드 단락</p>
                  <p className="italic">{copy.leadParagraph}</p>
                </div>
              </div>
            )}

            {psych && (
              <div className="mb-3 rounded-md border border-[#8B5CF6]/20 bg-[#F5F3FF] p-3 text-xs">
                <div className="flex items-center gap-2 mb-2">
                  <AgentChip agentId="psyche" size="xs" />
                  <span className="font-semibold">심리 레버 진단</span>
                </div>
                <p className="text-muted-foreground mb-1">감지된 편향 활용</p>
                <ul className="space-y-0.5 mb-2">
                  {psych.detectedBiases.map((b, i) => (
                    <li key={i}>• {b}</li>
                  ))}
                </ul>
                <p className="text-muted-foreground mb-1">CTA 대안</p>
                <ul className="space-y-0.5">
                  {psych.ctaVariants.map((v, i) => (
                    <li key={i}>
                      <strong>"{v.label}"</strong> — {v.rationale}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              placeholder="아웃라인 생성 후 'AI 드래프트'를 눌러 본문을 자동 생성하거나, 직접 작성하세요."
              rows={24}
              className="w-full rounded-md border bg-background p-3 font-mono text-xs outline-none focus:border-[#74594b] focus:ring-2 focus:ring-[#74594b]/20"
            />
          </AdminCard>
        </div>

        {/* Right: Sticky sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          {/* Checklist */}
          <AdminCard
            title="검수 체크리스트"
            description={`${kpiDef.icon} ${kpiDef.label}`}
            headerAction={
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  allChecksDone
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {passedChecks}/{totalChecks}
              </span>
            }
          >
            <ul className="space-y-1.5">
              {strategy.optimization_checklist.map((chk, i) => (
                <li key={chk} className="flex items-start gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={checked.has(i)}
                    onChange={() => toggleCheck(i)}
                    className="mt-0.5 cursor-pointer"
                  />
                  <span
                    onClick={() => toggleCheck(i)}
                    className={cn(
                      "cursor-pointer select-none",
                      checked.has(i) && "text-muted-foreground line-through"
                    )}
                  >
                    {chk}
                  </span>
                </li>
              ))}
            </ul>
          </AdminCard>

          {/* Metadata */}
          <AdminCard title="메타데이터">
            <dl className="space-y-2 text-xs">
              <MetaRow label="슬러그" value={<code className="font-mono">{c.slug}</code>} />
              <MetaRow label="타입" value={c.content_type} />
              <MetaRow label="키워드" value={c.primary_keyword} />
              {c.secondary_keywords.length > 0 && (
                <MetaRow label="보조 키워드" value={c.secondary_keywords.join(", ")} />
              )}
              {c.scheduled_at && (
                <MetaRow
                  label="예약 발행"
                  value={new Date(c.scheduled_at).toLocaleString("ko-KR")}
                />
              )}
              {c.published_at && (
                <MetaRow
                  label="발행 완료"
                  value={
                    <span className="text-emerald-600 font-semibold">
                      {new Date(c.published_at).toLocaleString("ko-KR")}
                    </span>
                  }
                />
              )}
            </dl>
          </AdminCard>

          {/* Metrics (if published) */}
          {c.metrics && (
            <AdminCard title="현재 성과">
              <dl className="space-y-2 text-xs">
                <MetaRow label="조회수" value={<strong>{c.metrics.page_views.toLocaleString()}</strong>} />
                <MetaRow label="평균 체류" value={<strong>{c.metrics.avg_dwell_time_sec}초</strong>} />
                <MetaRow label="스크롤 깊이" value={<strong>{c.metrics.scroll_depth_pct}%</strong>} />
                <MetaRow label="CTA 클릭" value={<strong>{c.metrics.cta_clicks}</strong>} />
                <MetaRow label="예약 전환" value={<strong>{c.metrics.booking_conversions}</strong>} />
              </dl>
            </AdminCard>
          )}
        </aside>
      </div>

      {/* Publish modal */}
      {confirmPublish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background shadow-xl">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-bold">콘텐츠 발행</h3>
            </div>
            <div className="p-6">
              <p className="text-sm">
                "<strong>{c.title}</strong>"을(를) 발행하시겠어요?
              </p>
              <div className="mt-3 rounded-md bg-muted/40 p-3 text-xs">
                <p className="font-medium mb-1">발행 후 후속 워크플로우</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <AgentChip agentId="social" size="xs" /> 24h 내 소셜 리퍼포징
                  </li>
                  <li className="flex items-center gap-1.5">
                    <AgentChip agentId="care" size="xs" /> 뉴스레터 예약 발송
                  </li>
                  <li className="flex items-center gap-1.5">
                    <AgentChip agentId="perf" size="xs" /> GA4 트래킹 자동 연결
                  </li>
                </ul>
              </div>
              {!allChecksDone && (
                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs">
                  <p className="font-medium text-amber-800">
                    ⚠️ 체크리스트 {totalChecks - passedChecks}개 미완료
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-6 py-3 border-t">
              <button
                onClick={() => setConfirmPublish(false)}
                className="h-8 rounded-md border px-3 text-xs hover:bg-accent"
              >
                취소
              </button>
              <button
                onClick={publish}
                className="h-8 rounded-md bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                🚀 지금 발행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}
