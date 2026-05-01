"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Icon, PageHeader } from "../_ui"

type Stage = "selecting" | "brief" | "writing" | "imaging" | "reviewing" | "approving" | "done"
type Quality = "flash" | "pro"
type ForcedTemplate = "auto" | "steps" | "compare" | "story"

interface FullRunResult {
  ok: boolean
  runId: string
  ideaId: string
  topicId?: string
  draftId?: string
  reviewId?: string
  heroUrl?: string | null
  stage: Stage
  durationMs: number
  error?: string
  steps: { brief?: number; write?: number; image?: number; review?: number }
  warnings?: string[]
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
  imaging:   { emoji: "🖼", label: "이미지 생성" },
  reviewing: { emoji: "🔍", label: "검수" },
  approving: { emoji: "✅", label: "검수 완료" },
  done:      { emoji: "🎉", label: "완료" },
}

type StartWhen = "now" | "after-5min" | "after-15min" | "after-30min" | "after-1hour" | "specific"

export default function AutomationPage() {
  const [running, setRunning] = useState(false)
  const [currentStage, setCurrentStage] = useState<Stage | null>(null)
  const [lastResult, setLastResult] = useState<FullRunResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<AutomationRun[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  /* 시작 시점 */
  const [startWhen, setStartWhen] = useState<StartWhen>("now")
  const [specificTime, setSpecificTime] = useState("") // HH:MM 24h
  const [scheduledAt, setScheduledAt] = useState<number | null>(null) // 예약 시각 (epoch ms)
  const [countdown, setCountdown] = useState<string>("")

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

  /** 시작 시점 → 지연(ms) 계산 */
  const computeDelay = (): number => {
    if (startWhen === "now") return 0
    if (startWhen === "after-5min") return 5 * 60 * 1000
    if (startWhen === "after-15min") return 15 * 60 * 1000
    if (startWhen === "after-30min") return 30 * 60 * 1000
    if (startWhen === "after-1hour") return 60 * 60 * 1000
    if (startWhen === "specific") {
      const m = specificTime.match(/^(\d{1,2}):(\d{2})$/)
      if (!m) return 0
      const target = new Date()
      target.setHours(parseInt(m[1]), parseInt(m[2]), 0, 0)
      if (target.getTime() <= Date.now()) target.setDate(target.getDate() + 1)
      return target.getTime() - Date.now()
    }
    return 0
  }

  /** 단계별 시뮬레이션 (UI 만 — 실제 진행은 서버) */
  const simulateStages = (totalMs: number) => {
    /* 가중 진행 — 본문 작성·이미지가 가장 오래 걸림 */
    const stages: Array<{ s: Stage; weight: number }> = [
      { s: "selecting", weight: 0.5 },
      { s: "brief", weight: 1.5 },
      { s: "writing", weight: 4 },
      { s: "imaging", weight: 3 },
      { s: "reviewing", weight: 2 },
      { s: "approving", weight: 0.5 },
    ]
    const totalWeight = stages.reduce((a, b) => a + b.weight, 0)
    let acc = 0
    for (const { s, weight } of stages) {
      const offset = (acc / totalWeight) * totalMs
      setTimeout(() => setCurrentStage(s), offset)
      acc += weight
    }
  }

  /** 실제 호출 */
  const performRun = async () => {
    setRunning(true)
    setError(null)
    setLastResult(null)
    setCurrentStage("selecting")
    /* UI 단계 페이크 진행 (60s 가정 — 실제 길이는 서버) */
    simulateStages(60_000)
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
      if (!j.ok) setError(j.error ?? "자동화 실패")
      else await loadHistory()
    } catch (e) {
      setError(e instanceof Error ? e.message : "자동화 실패")
    } finally {
      setRunning(false)
      setCurrentStage(null)
      setScheduledAt(null)
    }
  }

  const runAutomation = async () => {
    const delay = computeDelay()
    if (delay <= 0) {
      await performRun()
      return
    }
    /* 예약 — setTimeout 으로 (PC 열려 있다는 전제) */
    const at = Date.now() + delay
    setScheduledAt(at)
    setError(null)
    /* delay 후 실제 호출 */
    setTimeout(() => {
      performRun()
    }, delay)
  }

  /** 카운트다운 표시 */
  useEffect(() => {
    if (!scheduledAt) {
      setCountdown("")
      return
    }
    const tick = () => {
      const remain = scheduledAt - Date.now()
      if (remain <= 0) {
        setCountdown("")
        return
      }
      const min = Math.floor(remain / 60000)
      const sec = Math.floor((remain % 60000) / 1000)
      setCountdown(`${min}:${String(sec).padStart(2, "0")}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [scheduledAt])

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

            {/* 시작 시점 (PC 열려있다는 전제) */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 8 }}>
                언제 시작
              </div>
              <select
                value={startWhen}
                onChange={(e) => setStartWhen(e.target.value as StartWhen)}
                disabled={running || scheduledAt != null}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: 12.5,
                  border: "1px solid var(--border-default)",
                  borderRadius: 6,
                  background: "white",
                  cursor: "pointer",
                }}
              >
                <option value="now">즉시</option>
                <option value="after-5min">5분 뒤</option>
                <option value="after-15min">15분 뒤</option>
                <option value="after-30min">30분 뒤</option>
                <option value="after-1hour">1시간 뒤</option>
                <option value="specific">특정 시각…</option>
              </select>
              {startWhen === "specific" && (
                <input
                  type="time"
                  value={specificTime}
                  onChange={(e) => setSpecificTime(e.target.value)}
                  disabled={running || scheduledAt != null}
                  style={{
                    marginTop: 6,
                    width: "100%",
                    padding: "8px 10px",
                    fontSize: 12.5,
                    border: "1px solid var(--border-default)",
                    borderRadius: 6,
                  }}
                />
              )}
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 6, lineHeight: 1.5 }}>
                ⚠️ PC 가 켜져 있어야 동작. 닫혀도 동작하려면 우측 \&quot;스케줄 등록\&quot; 사용
              </div>
            </div>

            {/* 단계 네비게이터 */}
            {(running || scheduledAt) && (
              <div style={{ marginBottom: 14, padding: "10px 12px", background: "var(--bg-subtle)", border: "1px solid var(--border-default)", borderRadius: 8 }}>
                <StageNavigator currentStage={currentStage} scheduled={scheduledAt} countdown={countdown} />
              </div>
            )}

            {/* 실행 버튼 */}
            <button
              type="button"
              onClick={runAutomation}
              disabled={running || scheduledAt != null}
              style={{
                width: "100%",
                padding: "14px",
                background: (running || scheduledAt != null) ? "#cbd5e1" : "linear-gradient(135deg, var(--brand-600) 0%, var(--brand-700) 100%)",
                color: "white",
                border: 0,
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 700,
                cursor: (running || scheduledAt != null) ? "not-allowed" : "pointer",
                boxShadow: (running || scheduledAt != null) ? "none" : "0 4px 14px rgba(99,102,241,0.30)",
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
              ) : scheduledAt ? (
                <>⏳ 예약 대기 중 · {countdown}</>
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
                    {lastResult.steps.image != null && <> · 🖼 이미지 {(lastResult.steps.image / 1000).toFixed(1)}s</>}
                    {lastResult.steps.review != null && <> · 🔍 검수 {(lastResult.steps.review / 1000).toFixed(1)}s</>}
                  </div>
                )}
                {lastResult.warnings && lastResult.warnings.length > 0 && (
                  <div style={{ marginTop: 6, padding: "6px 8px", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 4, color: "#92400e", fontSize: 11 }}>
                    {lastResult.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
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

        {/* 스케줄 설정 카드 */}
        <ScheduleCard />
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

/* ─── 단계 네비게이터 (Stepper) ────────────────────────────── */
/** 단계별 가중치 — simulateStages 와 동일. 진행률 % 계산용 */
const STAGE_WEIGHTS: Array<{ s: Stage; weight: number }> = [
  { s: "selecting", weight: 0.5 },
  { s: "brief", weight: 1.5 },
  { s: "writing", weight: 4 },
  { s: "imaging", weight: 3 },
  { s: "reviewing", weight: 2 },
  { s: "approving", weight: 0.5 },
  { s: "done", weight: 0 },
]
const TOTAL_STAGE_WEIGHT = STAGE_WEIGHTS.reduce((a, b) => a + b.weight, 0)

/** 현재 단계까지 + 가중치 누적 → 진행률 % */
function computeProgress(currentStage: Stage | null): number {
  if (!currentStage) return 0
  if (currentStage === "done") return 100
  let acc = 0
  for (const { s, weight } of STAGE_WEIGHTS) {
    if (s === currentStage) {
      /* 현재 단계는 절반쯤 진행됐다고 표시 */
      return Math.round(((acc + weight * 0.5) / TOTAL_STAGE_WEIGHT) * 100)
    }
    acc += weight
  }
  return 0
}

function StageNavigator({
  currentStage,
  scheduled,
  countdown,
}: {
  currentStage: Stage | null
  scheduled: number | null
  countdown: string
}) {
  const stages: Stage[] = ["selecting", "brief", "writing", "imaging", "reviewing", "approving", "done"]
  const currentIdx = currentStage ? stages.indexOf(currentStage) : -1
  const progressPct = computeProgress(currentStage)

  if (scheduled && currentIdx < 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--text-secondary)" }}>
        <span style={{ fontSize: 16 }}>⏳</span>
        <span>예약 대기 중 — <b>{countdown}</b> 후 실행</span>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)" }}>
          진행 단계
        </div>
        <div className="text-mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--brand-700)" }}>
          {progressPct}%
        </div>
      </div>

      {/* 진행률 바 */}
      <div
        style={{
          height: 6,
          background: "var(--bg-muted)",
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: 12,
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: progressPct >= 100
              ? "linear-gradient(90deg, #10b981 0%, #34d399 100%)"
              : "linear-gradient(90deg, var(--brand-500) 0%, var(--brand-700) 100%)",
            borderRadius: 999,
            transition: "width 0.3s ease",
            boxShadow: "0 0 8px rgba(99,102,241,0.35)",
          }}
        />
      </div>

      {/* 단계별 동그라미 */}
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        {stages.map((s, i) => {
          const meta = STAGE_LABEL[s]
          const isPast = i < currentIdx
          const isNow = i === currentIdx
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", flex: i === stages.length - 1 ? 0 : 1 }}>
              <div
                title={meta.label}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  background: isNow ? "var(--brand-600)" : isPast ? "#10b981" : "var(--bg-muted)",
                  color: isNow || isPast ? "white" : "var(--text-muted)",
                  border: isNow ? "3px solid var(--brand-200)" : "0",
                  flexShrink: 0,
                  transition: "all 0.2s",
                  animation: isNow ? "stage-pulse 1.4s ease-in-out infinite" : "none",
                }}
              >
                {isPast ? "✓" : meta.emoji}
              </div>
              {i < stages.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    background: isPast ? "#10b981" : "var(--border-default)",
                    margin: "0 4px",
                    transition: "background 0.3s",
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* 현재 단계 라벨 */}
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8, textAlign: "center", fontWeight: 600 }}>
        {currentStage
          ? <>{STAGE_LABEL[currentStage].emoji} <b>{STAGE_LABEL[currentStage].label}</b> 중…</>
          : "대기 중"}
      </div>

      <style jsx global>{`
        @keyframes stage-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.5); }
          50% { box-shadow: 0 0 0 6px rgba(99, 102, 241, 0); }
        }
      `}</style>
    </div>
  )
}

/* ─── 스케줄 명령 생성기 ───────────────────────────────────────
   사용자가 라디오 + 시간 선택 → cron expression + Claude /schedule
   명령어 자동 생성. 클립보드 복사 버튼 포함.
   PC 꺼져 있어도 Anthropic 클라우드에서 실행. */
function ScheduleCard() {
  type Mode = "daily" | "weekly" | "hourly" | "custom"
  const [mode, setMode] = useState<Mode>("daily")
  const [hour, setHour] = useState(9)
  const [minute, setMinute] = useState(0)
  const [weekday, setWeekday] = useState(1) // 1 = Mon
  const [customCron, setCustomCron] = useState("0 9 * * *")
  const [copied, setCopied] = useState(false)

  const cron = (() => {
    const hh = String(hour).padStart(2, "0")
    const mm = String(minute).padStart(2, "0")
    void hh; void mm
    if (mode === "daily") return `${minute} ${hour} * * *`
    if (mode === "weekly") return `${minute} ${hour} * * ${weekday}`
    if (mode === "hourly") return `${minute} * * * *`
    return customCron
  })()

  const description = (() => {
    const hh = String(hour).padStart(2, "0")
    const mm = String(minute).padStart(2, "0")
    const wdNames = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"]
    if (mode === "daily") return `매일 ${hh}:${mm}`
    if (mode === "weekly") return `매주 ${wdNames[weekday]} ${hh}:${mm}`
    if (mode === "hourly") return `매시 ${mm}분`
    return "커스텀 cron"
  })()

  const command = `/schedule "${cron}" "자동화 페이지의 '자동 실행' 버튼 눌러서 콘텐츠 1편을 만들어줘"`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      /* clipboard 실패 시 selection */
    }
  }

  const radio = (m: Mode, label: string) => (
    <button
      key={m}
      type="button"
      onClick={() => setMode(m)}
      style={{
        padding: "6px 12px",
        fontSize: 11.5,
        fontWeight: 600,
        border: `1.5px solid ${mode === m ? "var(--brand-500)" : "var(--border-default)"}`,
        background: mode === m ? "var(--brand-50, #eef2ff)" : "white",
        color: mode === m ? "var(--brand-800, #3730a3)" : "var(--text-secondary)",
        borderRadius: 6,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  )

  return (
    <div className="bcard">
      <div className="bcard__header">
        <div>
          <div className="bcard__title">📅 스케줄 등록</div>
          <div className="bcard__sub">Claude /schedule 명령 자동 생성 — Anthropic 클라우드, PC 꺼져 있어도 동작</div>
        </div>
      </div>
      <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* 주기 선택 */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
            주기
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {radio("daily", "매일")}
            {radio("weekly", "매주")}
            {radio("hourly", "매시간")}
            {radio("custom", "커스텀")}
          </div>
        </div>

        {/* 요일 (weekly) */}
        {mode === "weekly" && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
              요일
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setWeekday(i)}
                  style={{
                    width: 32, height: 32,
                    fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${weekday === i ? "var(--brand-500)" : "var(--border-default)"}`,
                    background: weekday === i ? "var(--brand-500)" : "white",
                    color: weekday === i ? "white" : "var(--text-secondary)",
                    borderRadius: 6, cursor: "pointer",
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 시간 (daily / weekly) */}
        {(mode === "daily" || mode === "weekly") && (
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>시</div>
              <select value={hour} onChange={(e) => setHour(parseInt(e.target.value))}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12, border: "1px solid var(--border-default)", borderRadius: 6 }}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, "0")}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>분</div>
              <select value={minute} onChange={(e) => setMinute(parseInt(e.target.value))}
                style={{ width: "100%", padding: "6px 8px", fontSize: 12, border: "1px solid var(--border-default)", borderRadius: 6 }}>
                {[0, 10, 15, 20, 30, 45].map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* 분 (hourly) */}
        {mode === "hourly" && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>매시 ?분</div>
            <select value={minute} onChange={(e) => setMinute(parseInt(e.target.value))}
              style={{ width: 100, padding: "6px 8px", fontSize: 12, border: "1px solid var(--border-default)", borderRadius: 6 }}>
              {[0, 15, 30, 45].map((m) => (
                <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
              ))}
            </select>
          </div>
        )}

        {/* 커스텀 cron */}
        {mode === "custom" && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>cron expression</div>
            <input value={customCron} onChange={(e) => setCustomCron(e.target.value)}
              placeholder="0 9 * * *"
              style={{ width: "100%", padding: "6px 8px", fontSize: 12, fontFamily: "ui-monospace, monospace", border: "1px solid var(--border-default)", borderRadius: 6 }} />
          </div>
        )}

        {/* 결과 미리보기 */}
        <div style={{ marginTop: 4 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 6 }}>
            🤖 생성된 Claude 명령어 ({description})
          </div>
          <div
            style={{
              padding: "10px 12px",
              background: "var(--bg-subtle)",
              border: "1px solid var(--border-default)",
              borderRadius: 6,
              fontFamily: "ui-monospace, monospace",
              fontSize: 11,
              wordBreak: "break-all",
              lineHeight: 1.5,
            }}
          >
            {command}
          </div>
          <button
            type="button"
            onClick={copy}
            style={{
              marginTop: 8,
              width: "100%",
              padding: "10px 14px",
              background: copied ? "#10b981" : "var(--brand-600)",
              color: "white",
              border: 0,
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {copied ? "✅ 복사됨 — Claude 에 붙여넣기" : "📋 명령어 복사"}
          </button>
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
            복사 후 Claude Code 에서 <code>Ctrl+V</code> 로 붙여넣기 → 엔터. 등록 후 Anthropic 클라우드에서 실행됩니다.
          </div>
        </div>
      </div>
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
