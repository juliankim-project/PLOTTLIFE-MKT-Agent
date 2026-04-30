"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Icon, PageHeader } from "../_ui"

type Stage = "selecting" | "brief" | "writing" | "reviewing" | "approving" | "done"
type Quality = "flash" | "pro"
type ForcedTemplate = "auto" | "steps" | "compare" | "story"

interface FullRunResult {
  ok: boolean
  runId: string
  ideaId: string
  topicId?: string
  draftId?: string
  reviewId?: string
  stage: Stage
  durationMs: number
  error?: string
  steps: { brief?: number; write?: number; review?: number }
}

interface AutomationRun {
  id: string
  draft_id: string
  draft_title: string
  ideaId: string | null
  reviewScore: number | null
  startedAt: string
  durationMs: number
  status: "running" | "succeeded" | "failed"
  stage: Stage
  error?: string | null
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

const STAGE_LABEL: Record<Stage, { emoji: string; label: string }> = {
  selecting: { emoji: "🔎", label: "주제 선택" },
  brief:     { emoji: "📋", label: "브리프 생성" },
  writing:   { emoji: "✍️", label: "본문 작성" },
  reviewing: { emoji: "🔍", label: "검수" },
  approving: { emoji: "✅", label: "검수 완료" },
  done:      { emoji: "🎉", label: "완료" },
}

export default function AutomationPage() {
  const [running, setRunning] = useState(false)
  const [currentStage, setCurrentStage] = useState<Stage | null>(null)
  const [lastResult, setLastResult] = useState<FullRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<AutomationRun[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  /* 옵션 */
  const [forcedTemplate, setForcedTemplate] = useState<ForcedTemplate>("auto")
  const [quality, setQuality] = useState<Quality>("flash")

  /* 실행 내역 로드 — drafts 의 metadata.automation_run_id 가 있는 것만 */
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const j = await safeFetchJson<{ ok: boolean; drafts?: Array<{ id: string; title: string; metadata: Record<string, unknown> | null; created_at: string; updated_at: string }> }>(
        "/api/drafts?statuses=approved,published,scheduled,drafting,reviewing&limit=200",
        { cache: "no-store" }
      )
      const runs: AutomationRun[] = (j.drafts ?? [])
        .filter((d) => d.metadata && (d.metadata as { automation_run_id?: string }).automation_run_id)
        .map((d) => {
          const meta = d.metadata as Record<string, unknown>
          return {
            id: String(meta.automation_run_id),
            draft_id: d.id,
            draft_title: d.title,
            ideaId: null,
            reviewScore: typeof meta.review_score === "number" ? meta.review_score as number : null,
            startedAt: d.created_at,
            durationMs: 0,
            status: "succeeded" as const,
            stage: "done" as Stage,
          }
        })
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .slice(0, 50)
      setHistory(runs)
    } catch (e) {
      console.warn("history load failed:", e)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  const runAutomation = async () => {
    setRunning(true)
    setError(null)
    setLastResult(null)
    setCurrentStage("selecting")
    try {
      const j = await safeFetchJson<{ ok: boolean; result: FullRunResult; error?: string }>(
        "/api/automation/full-run",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            forcedTemplate: forcedTemplate === "auto" ? undefined : forcedTemplate,
            quality,
          }),
        }
      )
      setLastResult(j.result)
      if (!j.ok) {
        setError(j.error ?? "자동화 실패")
      } else {
        await loadHistory()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "자동화 실패")
    } finally {
      setRunning(false)
      setCurrentStage(null)
    }
  }

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 09 · AUTOMATION"
        title="자동화"
        sub="1개 idea 부터 검수 완료까지 한 번에. shortlisted idea 중 fit_score 가장 높은 게 자동 선택됩니다."
        actions={[
          { label: "← 콘텐츠 관리", href: "/blog/contents" },
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
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span>⚠️</span>
          <span style={{ flex: 1 }}>{error}</span>
          <button onClick={() => setError(null)} style={{ background: "transparent", border: 0, color: "inherit" }}>✕</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* 실행 카드 */}
        <div className="bcard">
          <div className="bcard__header">
            <div>
              <div className="bcard__title">자동 실행</div>
              <div className="bcard__sub">1번 클릭으로 idea → 브리프 → 본문 → 검수 → 완료까지</div>
            </div>
          </div>
          <div style={{ padding: "16px 20px 20px" }}>
            {/* 본문 형태 선택 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>
                본문 형태
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 6 }}>
                {([
                  { v: "auto", emoji: "🤖", label: "자동" },
                  { v: "steps", emoji: "📖", label: "가이드형" },
                  { v: "compare", emoji: "⚖️", label: "비교/추천" },
                  { v: "story", emoji: "💬", label: "스토리/Q&A" },
                ] as const).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    onClick={() => setForcedTemplate(o.v)}
                    disabled={running}
                    style={{
                      padding: "8px 10px",
                      border: `1.5px solid ${forcedTemplate === o.v ? "var(--brand-500)" : "var(--border-default)"}`,
                      background: forcedTemplate === o.v ? "var(--brand-50, #eef2ff)" : "white",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: running ? "not-allowed" : "pointer",
                    }}
                  >
                    {o.emoji} {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 품질 */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>
                품질
              </div>
              <div style={{ display: "inline-flex", background: "white", border: "1px solid var(--border-default)", borderRadius: 999, padding: 2 }}>
                <button
                  type="button"
                  onClick={() => setQuality("flash")}
                  disabled={running}
                  style={qualBtnStyle(quality === "flash")}
                >💨 Flash</button>
                <button
                  type="button"
                  onClick={() => setQuality("pro")}
                  disabled={running}
                  style={qualBtnStyle(quality === "pro")}
                >🧠 Pro</button>
              </div>
            </div>

            {/* 실행 버튼 */}
            <button
              type="button"
              onClick={runAutomation}
              disabled={running}
              style={{
                width: "100%",
                padding: "14px",
                background: running ? "#cbd5e1" : "linear-gradient(135deg, var(--brand-600) 0%, var(--brand-700) 100%)",
                color: "white",
                border: 0,
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: running ? "not-allowed" : "pointer",
                boxShadow: running ? "none" : "0 4px 14px rgba(99,102,241,0.30)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
              }}
            >
              {running ? (
                <>
                  <Spinner /> {currentStage ? STAGE_LABEL[currentStage].label : "실행 중"}…
                </>
              ) : (
                <>🚀 자동 실행</>
              )}
            </button>

            {/* 마지막 결과 */}
            {lastResult && (
              <div
                style={{
                  marginTop: 14,
                  padding: "12px 14px",
                  background: lastResult.ok ? "#ecfdf5" : "#fef2f2",
                  border: `1px solid ${lastResult.ok ? "#a7f3d0" : "#fecaca"}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700, color: lastResult.ok ? "#047857" : "#b91c1c", marginBottom: 6 }}>
                  {lastResult.ok ? "✅ 완료" : `❌ ${STAGE_LABEL[lastResult.stage].label} 단계 실패`}
                  {" · "}
                  <span className="text-mono" style={{ fontWeight: 600 }}>
                    {(lastResult.durationMs / 1000).toFixed(1)}s
                  </span>
                </div>
                {lastResult.steps.brief != null && (
                  <div style={{ color: "var(--text-secondary)" }}>
                    📋 브리프 {(lastResult.steps.brief / 1000).toFixed(1)}s
                    {lastResult.steps.write != null && <> · ✍️ 작성 {(lastResult.steps.write / 1000).toFixed(1)}s</>}
                    {lastResult.steps.review != null && <> · 🔍 검수 {(lastResult.steps.review / 1000).toFixed(1)}s</>}
                  </div>
                )}
                {lastResult.draftId && (
                  <div style={{ marginTop: 6 }}>
                    <Link
                      href={`/blog/contents/${lastResult.draftId}`}
                      style={{ color: "var(--brand-600)", fontWeight: 600 }}
                    >
                      → 결과 콘텐츠 보기
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 안내 카드 */}
        <div className="bcard">
          <div className="bcard__header">
            <div>
              <div className="bcard__title">스케줄 설정</div>
              <div className="bcard__sub">정해진 시간에 반복 실행 (Anthropic 클라우드)</div>
            </div>
          </div>
          <div style={{ padding: "16px 20px", fontSize: 12.5, color: "var(--text-secondary)", lineHeight: 1.7 }}>
            <p style={{ marginBottom: 10 }}>
              <b style={{ color: "var(--text-primary)" }}>Claude Code <code>/schedule</code></b> 로 매일·주간 자동 실행 등록 가능. PC 가 꺼져 있어도 Anthropic 클라우드에서 실행됩니다.
            </p>
            <div style={{ padding: 10, background: "var(--bg-subtle)", borderRadius: 6, fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
              /schedule &quot;매일 09:00&quot; &quot;자동화 페이지의 자동 실행 버튼 눌러서 1편 만들어줘&quot;
            </div>
            <p style={{ marginTop: 12 }}>
              또는 직접 API 호출:
            </p>
            <div style={{ padding: 10, background: "var(--bg-subtle)", borderRadius: 6, fontFamily: "ui-monospace, monospace", fontSize: 11 }}>
              POST /api/automation/full-run
            </div>
          </div>
        </div>
      </div>

      {/* 실행 내역 */}
      <div className="bcard">
        <div className="bcard__header">
          <div>
            <div className="bcard__title">실행 내역</div>
            <div className="bcard__sub">
              {historyLoading ? "로드 중…" : `${history.length}건`}
            </div>
          </div>
          <button
            type="button"
            onClick={loadHistory}
            disabled={historyLoading}
            className="bbtn bbtn--ghost bbtn--sm"
            style={{ marginLeft: "auto" }}
          >
            <Icon name="clock" size={12} /> 새로고침
          </button>
        </div>
        {history.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
            아직 자동화 실행 기록이 없어요. 위 <b>🚀 자동 실행</b> 을 눌러보세요.
          </div>
        ) : (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 110px 90px 110px",
                gap: 12,
                padding: "10px 20px",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-secondary, #475569)",
                background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                borderTop: "1px solid var(--border-default)",
                borderBottom: "1px solid var(--border-default)",
                textTransform: "uppercase",
                letterSpacing: ".04em",
              }}
            >
              <div>제목</div>
              <div>실행 ID</div>
              <div>상태</div>
              <div>생성일</div>
            </div>
            {history.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 110px 90px 110px",
                  gap: 12,
                  padding: "12px 20px",
                  alignItems: "center",
                  fontSize: 12.5,
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <Link
                  href={`/blog/contents/${r.draft_id}`}
                  style={{ color: "var(--text-primary)", fontWeight: 600, textDecoration: "none" }}
                >
                  {r.draft_title}
                </Link>
                <span className="text-mono" style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                  {r.id.replace("auto_", "")}
                </span>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "3px 9px",
                    borderRadius: 999,
                    background: "#ecfdf5",
                    color: "#047857",
                    border: "1px solid #a7f3d0",
                    width: "fit-content",
                  }}
                >
                  ✅ 완료
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                  {new Date(r.startedAt).toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

function qualBtnStyle(on: boolean): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 700,
    padding: "5px 12px",
    border: 0,
    background: on ? "var(--brand-600)" : "transparent",
    color: on ? "white" : "var(--text-secondary)",
    borderRadius: 999,
    cursor: "pointer",
  }
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 14,
        height: 14,
        border: "2px solid rgba(255,255,255,0.3)",
        borderTopColor: "white",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
  )
}
