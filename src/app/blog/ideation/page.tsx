"use client"

import { useCallback, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Icon, PageHeader } from "../_ui"
import { PERSONAS } from "../_lib/stages"
import type { IconName } from "../_lib/stages"

interface InputSource {
  id: string
  icon: IconName
  label: string
  meta: string
}

const INPUTS: InputSource[] = [
  { id: "trends", icon: "trend", label: "검색 트렌드", meta: "Top 6 키워드" },
  { id: "competitor", icon: "globe", label: "경쟁사 블로그", meta: "엔코·미스터멘션 외 4" },
  { id: "product", icon: "hash", label: "플라트 매물·리뷰", meta: "1,842 매물 / 3,104 리뷰" },
  { id: "community", icon: "rss", label: "유학생 커뮤니티", meta: "X · Threads · Reddit" },
  { id: "booking", icon: "users", label: "예약 로그 패턴", meta: "1.2K 전환 스니펫" },
]

const CLUSTER_LABEL: Record<string, string> = {
  consider: "Consider", prepare: "Prepare", arrive: "Arrive", settle: "Settle",
  live: "Live", explore: "Explore", change: "Change",
}

interface DbIdea {
  id: string
  title: string
  cluster: string | null
  rationale: string | null
  volume: number | null
  fit_score: number | null
  signal: { kind?: string; detail?: string } | null
  related_keywords: string[] | null
  status: string
  created_at: string
}

function formatVolume(v: number | null): string {
  if (v == null) return "—"
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`
  return String(v)
}
function isHotSignal(kind?: string): boolean {
  return kind === "search-rising" || kind === "competitor-miss"
}

/** fetch 결과를 안전하게 JSON 으로 파싱 (Vercel timeout 시 HTML/text 반환 대응) */
async function safeFetchJson<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const r = await fetch(input, init)
  const text = await r.text()
  try {
    return JSON.parse(text) as T
  } catch {
    const preview = text.slice(0, 200).replace(/\s+/g, " ").trim()
    throw new Error(
      r.ok
        ? `응답이 JSON 이 아니에요 — ${preview}`
        : `요청 실패 (HTTP ${r.status}) — ${preview}`
    )
  }
}

type GenPhase = "idle" | "calling-ai" | "parsing" | "saving" | "done"

export default function IdeationPage() {
  const router = useRouter()
  const [selectedInputs, setSelectedInputs] = useState<Set<string>>(
    new Set(["trends", "competitor", "product"])
  )
  const [selectedPersona, setSelectedPersona] = useState("student")
  const [temperature, setTemperature] = useState(0.7)
  const [count, setCount] = useState(30)
  const [prompt, setPrompt] = useState(
    "선택된 인풋과 페르소나를 바탕으로, 플라트라이프 게스트 여정 단계(Consider/Prepare/Arrive/Settle/Live/Explore/Change)별로 분산해 롱테일 단기임대 주제를 30개 생성해줘."
  )

  const [phase, setPhase] = useState<GenPhase>("idle")
  const [progress, setProgress] = useState(0)
  const [ideas, setIdeas] = useState<DbIdea[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showHistory, setShowHistory] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRunMeta, setLastRunMeta] = useState<{
    count: number
    provider: string
    model: string
    durationMs: number
  } | null>(null)

  const toggle = (id: string) => {
    const n = new Set(selectedInputs)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    setSelectedInputs(n)
  }

  /** fit_score 내림차순 정렬 */
  const sortedIdeas = useMemo(() => {
    return [...ideas].sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
  }, [ideas])

  /** 개별 선택 토글 */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  const allSelected = ideas.length > 0 && selectedIds.size === ideas.length
  const someSelected = selectedIds.size > 0 && !allSelected
  const toggleSelectAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(ideas.map((i) => i.id)))
  }

  /** 선택된 아이디어를 shortlist로 승격 + topics 페이지로 이동 */
  const promoteAndGoToFunnel = async () => {
    if (selectedIds.size === 0) return
    setPromoting(true)
    setError(null)
    try {
      const r = await safeFetchJson<{ ok: boolean; updated?: number; error?: string }>(
        "/api/ideation/shortlist",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ids: Array.from(selectedIds) }),
        }
      )
      if (!r.ok) throw new Error(r.error ?? "shortlist 실패")
      router.push("/blog/topics")
    } catch (e) {
      setError(e instanceof Error ? e.message : "넘기기 실패")
      setPromoting(false)
    }
  }

  /** 이전 아이디어 불러오기 — 사용자 opt-in */
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true)
    setError(null)
    try {
      const j = await safeFetchJson<{ ok: boolean; ideas?: DbIdea[]; error?: string }>(
        "/api/ideation/ideas?status=draft&limit=50",
        { cache: "no-store" }
      )
      if (!j.ok) throw new Error(j.error ?? "불러오기 실패")
      const list = j.ideas ?? []
      setIdeas(list)
      // 불러온 것들도 기본 전체 선택
      setSelectedIds(new Set(list.map((i) => i.id)))
      setShowHistory(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류")
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  /** 개별 아이디어 버리기 */
  const discardIdea = async (id: string) => {
    setIdeas((prev) => prev.filter((i) => i.id !== id))
    setSelectedIds((prev) => {
      const n = new Set(prev)
      n.delete(id)
      return n
    })
    try {
      await fetch(`/api/ideation/ideas/${id}`, { method: "DELETE" })
    } catch {
      // 실패해도 UI 롤백은 생략
    }
  }

  /** AI로 주제 생성 */
  const handleGenerate = async () => {
    setError(null)
    setLastRunMeta(null)
    setPhase("calling-ai")
    setProgress(8)

    // 가짜 progress — 실제 응답 기다리는 동안 사용자 피드백
    let tick = 0
    const timer = setInterval(() => {
      tick++
      setProgress((p) => Math.min(p + (tick < 10 ? 4 : 2), 92))
      if (tick === 12) setPhase("parsing")
      if (tick === 20) setPhase("saving")
    }, 1500)

    try {
      const persona = PERSONAS.find((p) => p.id === selectedPersona)
      const researchContext = [
        `선택된 인풋 소스: ${Array.from(selectedInputs)
          .map((id) => INPUTS.find((x) => x.id === id)?.label)
          .filter(Boolean)
          .join(", ")}`,
        `\n사용자 가이드:\n${prompt}`,
      ].join("\n")

      const j = await safeFetchJson<{
        ok: boolean
        result?: {
          count: number
          provider: string
          model: string
          durationMs: number
          ideas: DbIdea[]
        }
        error?: string
      }>("/api/ideation/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          personaSlug: selectedPersona,
          personaLabel: persona?.label,
          count,
          temperature,
          researchContext,
        }),
      })

      if (!j.ok || !j.result) throw new Error(j.error ?? "생성 실패")

      setLastRunMeta({
        count: j.result.count,
        provider: j.result.provider,
        model: j.result.model,
        durationMs: j.result.durationMs,
      })
      // 새로 만든 것만 뜨게 — 스트림 리셋 후 새 결과로
      const newIdeas = j.result.ideas
      setIdeas(newIdeas)
      // 생성 직후 전체 자동 선택 (사용자가 걸러내는 흐름)
      setSelectedIds(new Set(newIdeas.map((i) => i.id)))
      setShowHistory(false)
      setProgress(100)
      setPhase("done")
      setTimeout(() => {
        setPhase("idle")
        setProgress(0)
      }, 1500)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "생성 실패"
      setError(
        msg.includes("504") || msg.includes("timeout") || msg.includes("JSON")
          ? "서버 응답이 너무 오래 걸렸어요. Gemini가 혼잡한 시간일 수 있습니다 — 1분 뒤 다시 시도해 보세요. 이미 생성된 주제는 '이전 아이디어 불러오기'에서 확인할 수 있어요."
          : msg
      )
      setPhase("idle")
      setProgress(0)
    } finally {
      clearInterval(timer)
    }
  }

  const phaseLabel: Record<GenPhase, string> = {
    idle: "",
    "calling-ai": "Gemini 에이전트에게 주제를 요청 중…",
    parsing: "응답을 분석하고 여정 단계별로 분류 중…",
    saving: "DB에 아이디어를 저장 중…",
    done: "완료!",
  }

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 02 · IDEATION"
        title="아이데이션"
        sub="수집된 인풋을 연결해 AI가 30~50개의 단기임대 토픽 아이디어를 확장 생성합니다. 게스트 여정 단계별 클러스터로 묶여 다음 단계 퍼널로 넘어갑니다."
        actions={[
          {
            label: "주제선정으로 →",
            primary: true,
            onClick: () => router.push("/blog/topics"),
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
            display: "flex",
            gap: 8,
            alignItems: "flex-start",
          }}
        >
          <span>⚠️</span>
          <span style={{ flex: 1, lineHeight: 1.5 }}>{error}</span>
          <button
            onClick={() => setError(null)}
            style={{
              fontSize: 12,
              color: "var(--danger-fg)",
              cursor: "pointer",
              background: "transparent",
              border: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      <div className="ideation-grid">
        {/* LEFT: Inputs panel */}
        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">인풋 소스</div>
            <span className="bchip bchip--brand" style={{ marginLeft: "auto" }}>
              {selectedInputs.size}개 선택
            </span>
          </div>
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {INPUTS.map((i) => {
              const on = selectedInputs.has(i.id)
              return (
                <div
                  key={i.id}
                  onClick={() => toggle(i.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "9px 10px",
                    borderRadius: "var(--r-md)",
                    cursor: "pointer",
                    background: on ? "var(--brand-50)" : "transparent",
                    border: `1px solid ${on ? "var(--brand-200)" : "transparent"}`,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 7,
                      background: on ? "var(--brand-500)" : "var(--bg-muted)",
                      color: on ? "white" : "var(--text-tertiary)",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <Icon name={i.icon} size={13} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{i.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{i.meta}</div>
                  </div>
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: `1.5px solid ${on ? "var(--brand-600)" : "var(--border-strong)"}`,
                      background: on ? "var(--brand-600)" : "white",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    {on && <Icon name="check" size={10} stroke={3} style={{ color: "white" }} />}
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border-subtle)" }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".04em",
                marginBottom: 8,
              }}
            >
              페르소나
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {PERSONAS.map((p) => (
                <label
                  key={p.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                    background: selectedPersona === p.id ? "var(--bg-muted)" : "transparent",
                  }}
                >
                  <input
                    type="radio"
                    checked={selectedPersona === p.id}
                    onChange={() => setSelectedPersona(p.id)}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500 }}>{p.label}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>{p.desc}</div>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {Math.round(p.match * 100)}%
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER: Generator */}
        <div className="bcard">
          <div className="bcard__header">
            <div className="bcard__title">AI 토픽 제너레이터</div>
            <span className="bchip" style={{ marginLeft: "auto" }}>
              Gemini 2.5 Flash · Plott Blog Ideator
            </span>
          </div>
          <div style={{ padding: 20 }}>
            <label
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: ".04em",
              }}
            >
              생성 지시문
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={phase !== "idle" && phase !== "done"}
              style={{
                width: "100%",
                minHeight: 110,
                marginTop: 8,
                padding: 12,
                border: "1px solid var(--border-default)",
                borderRadius: "var(--r-md)",
                resize: "vertical",
                fontSize: 13,
                lineHeight: 1.5,
                background: "var(--bg-subtle)",
                fontFamily: "inherit",
              }}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                  창의성 (Temperature)
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span className="text-mono" style={{ fontSize: 12, fontWeight: 600, minWidth: 28 }}>
                    {temperature.toFixed(1)}
                  </span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>
                  생성 개수
                </label>
                <select
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value, 10))}
                  disabled={phase !== "idle" && phase !== "done"}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "7px 10px",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-md)",
                    background: "white",
                  }}
                >
                  <option value={10}>10개 (15~25초)</option>
                  <option value={20}>20개 (20~35초)</option>
                  <option value={30}>30개 (25~45초)</option>
                  <option value={50}>50개 (~60초)</option>
                </select>
              </div>
            </div>

            <button
              className="bbtn bbtn--primary bbtn--lg"
              style={{ width: "100%", marginTop: 16, position: "relative", overflow: "hidden" }}
              onClick={handleGenerate}
              disabled={phase !== "idle" && phase !== "done"}
            >
              {phase === "idle" || phase === "done" ? (
                <>
                  <Icon name="sparkles" size={15} />
                  아이디어 생성
                </>
              ) : (
                <>
                  <Spinner />
                  <span style={{ marginLeft: 4 }}>{phaseLabel[phase]}</span>
                </>
              )}
            </button>

            {phase !== "idle" && phase !== "done" && (
              <div style={{ marginTop: 12 }}>
                <div className="bar-track" style={{ height: 4 }}>
                  <div
                    className="bar-fill"
                    style={{
                      width: `${progress}%`,
                      transition: "width 1.2s linear",
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    color: "var(--text-muted)",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>{phaseLabel[phase]}</span>
                  <span className="text-mono">{progress}%</span>
                </div>
              </div>
            )}

            {phase === "done" && (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 10px",
                  background: "var(--success-bg)",
                  border: "1px solid var(--success-border)",
                  borderRadius: "var(--r-md)",
                  fontSize: 11.5,
                  color: "var(--success-fg)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ✓ 완료 —
                {lastRunMeta && (
                  <>
                    <b>{lastRunMeta.count}개</b> 생성 · {lastRunMeta.model} ·{" "}
                    {(lastRunMeta.durationMs / 1000).toFixed(1)}s
                  </>
                )}
              </div>
            )}

            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: "var(--brand-50)",
                borderRadius: "var(--r-md)",
                border: "1px solid var(--brand-100)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--brand-700)", marginBottom: 4 }}>
                💡 제안
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                인풋 소스 3개 이상 선택 시 클러스터 품질이 <b>+28%</b> 향상됩니다. 유학생 커뮤니티까지 함께 선택하면
                <b> Arrive·Settle</b> 단계 주제 다양성이 좋아집니다.
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Ideas stream */}
        <div className="bcard">
          <div className="bcard__header">
            <div>
              <div className="bcard__title">아이디어 스트림</div>
              <div className="bcard__sub">
                {ideas.length > 0
                  ? `${selectedIds.size}/${ideas.length}개 선택 · 점수순`
                  : "빈 상태"}
              </div>
            </div>
            {ideas.length === 0 && !showHistory && (
              <button
                className="bbtn bbtn--ghost bbtn--sm"
                style={{ marginLeft: "auto" }}
                onClick={loadHistory}
                disabled={historyLoading}
                title="DB에 저장된 지난 draft 아이디어 가져오기"
              >
                <Icon name="clock" size={12} /> {historyLoading ? "로드 중…" : "이전 아이디어"}
              </button>
            )}
          </div>

          {ideas.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 16px",
                borderBottom: "1px solid var(--border-subtle)",
                background: "var(--bg-subtle)",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected
                  }}
                  onChange={toggleSelectAll}
                />
                전체 {allSelected ? "해제" : "선택"}
              </label>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)" }}>
                높은 점수 → 낮은 점수 순
              </span>
            </div>
          )}
          <div style={{ maxHeight: 560, overflowY: "auto" }}>
            {phase !== "idle" && phase !== "done" && ideas.length === 0 && (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <Spinner size={28} />
                </div>
                {phaseLabel[phase]}
              </div>
            )}

            {phase === "idle" && ideas.length === 0 && (
              <div
                style={{
                  padding: "40px 24px",
                  textAlign: "center",
                  color: "var(--text-muted)",
                  fontSize: 12.5,
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>✨</div>
                아직 생성된 주제가 없어요.
                <br />
                좌측에서 인풋·페르소나 고르고{" "}
                <b style={{ color: "var(--brand-600)" }}>아이디어 생성</b>을 눌러보세요.
                <br />
                <br />
                이전에 만든 주제를 불러오려면 상단의{" "}
                <b style={{ color: "var(--brand-600)" }}>이전 아이디어</b> 버튼을 눌러주세요.
              </div>
            )}

            {sortedIdeas.map((i) => {
              const clusterLabel = i.cluster ? CLUSTER_LABEL[i.cluster] ?? i.cluster : "—"
              const score = i.fit_score ?? 0
              const hot = isHotSignal(i.signal?.kind)
              const checked = selectedIds.has(i.id)
              return (
                <div
                  key={i.id}
                  onClick={(e) => {
                    const tag = (e.target as HTMLElement).tagName
                    if (tag !== "INPUT" && tag !== "BUTTON") toggleSelect(i.id)
                  }}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    cursor: "pointer",
                    background: checked ? "var(--brand-50)" : "transparent",
                    transition: "background 0.1s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSelect(i.id)}
                    style={{ marginTop: 10, flexShrink: 0, cursor: "pointer" }}
                  />
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `conic-gradient(var(--brand-500) ${score * 3.6}deg, var(--bg-muted) 0)`,
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                      position: "relative",
                    }}
                    title={i.signal?.detail ?? ""}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 2,
                        background: "white",
                        borderRadius: 6,
                        display: "grid",
                        placeItems: "center",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {score}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.35, marginBottom: 4 }}>
                      {hot && (
                        <span
                          style={{
                            marginRight: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--accent-rose)",
                          }}
                        >
                          🔥
                        </span>
                      )}
                      {i.title}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <span className="bchip">#{clusterLabel}</span>
                      <span className="bchip bchip--info">{formatVolume(i.volume)}</span>
                      {i.signal?.kind && (
                        <span className="bchip" style={{ color: "var(--text-muted)" }}>
                          {i.signal.kind}
                        </span>
                      )}
                    </div>
                    {i.rationale && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11,
                          color: "var(--text-muted)",
                          lineHeight: 1.4,
                        }}
                      >
                        {i.rationale}
                      </div>
                    )}
                  </div>
                  <button
                    className="bbtn bbtn--ghost bbtn--sm"
                    style={{ padding: "4px 6px" }}
                    title="버리기 (숨김)"
                    onClick={(e) => {
                      e.stopPropagation()
                      discardIdea(i.id)
                    }}
                  >
                    🗑
                  </button>
                </div>
              )
            })}
          </div>
          <div
            style={{
              padding: "12px 16px",
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              gap: 8,
            }}
          >
            <button
              className="bbtn bbtn--subtle"
              style={{ flex: 1 }}
              onClick={() => {
                setIdeas([])
                setSelectedIds(new Set())
              }}
              disabled={ideas.length === 0 || promoting}
              title="현재 스트림 비우기 (DB 는 유지)"
            >
              화면 비우기
            </button>
            <button
              className="bbtn bbtn--primary"
              style={{ flex: 2 }}
              onClick={promoteAndGoToFunnel}
              disabled={selectedIds.size === 0 || promoting}
              title={
                selectedIds.size === 0
                  ? "최소 1개 이상 선택해야 넘길 수 있어요"
                  : `${selectedIds.size}개를 shortlist 로 등록 후 주제선정 퍼널로 이동`
              }
            >
              {promoting ? (
                <>
                  <Spinner />
                  <span style={{ marginLeft: 4 }}>넘기는 중…</span>
                </>
              ) : (
                <>
                  {selectedIds.size > 0 ? `${selectedIds.size}개 ` : ""}퍼널로 넘기기{" "}
                  <Icon name="chevron" size={12} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .blog-shell .ideation-grid {
          display: grid;
          grid-template-columns: 260px 1fr 380px;
          gap: 14px;
          align-items: start;
        }
        @media (max-width: 1180px) {
          .blog-shell .ideation-grid { grid-template-columns: 1fr; }
        }
        @keyframes ideation-spin {
          to { transform: rotate(360deg); }
        }
        .blog-shell .ideation-spinner {
          display: inline-block;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: ideation-spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  )
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      className="ideation-spinner"
      style={{
        width: size,
        height: size,
      }}
    />
  )
}
