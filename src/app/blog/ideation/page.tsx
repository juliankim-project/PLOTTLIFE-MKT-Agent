"use client"

import { useCallback, useEffect, useMemo, useState, Suspense } from "react"
import { useRouter } from "next/navigation"
import { Icon, PageHeader } from "../_ui"
import { PERSONAS } from "../_lib/stages"
import {
  INTENT_DEFS,
  INTENT_ORDER,
  JOURNEY_STAGES,
  STAGE_DEFS,
  SEASONS,
  LIFE_TRIGGERS,
  PAIN_TAGS,
  guessAxesFromText,
  type Intent,
  type JourneyStage,
} from "@/lib/ideation/compass"

/* ══════════════════════════════════════════════════════════════
 * Types
 * ══════════════════════════════════════════════════════════════ */

interface DbIdea {
  id: string
  title: string
  cluster: string | null
  rationale: string | null
  volume: number | null
  fit_score: number | null
  signal: { kind?: string; detail?: string; intent?: string } | null
  related_keywords: string[] | null
  status: string
  created_at: string
}

type GenPhase = "idle" | "calling-ai" | "parsing" | "saving" | "done"

function formatVolume(v: number | null): string {
  if (v == null) return "—"
  if (v >= 1000) return `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}K`
  return String(v)
}
function isHotSignal(kind?: string): boolean {
  return kind === "search-rising" || kind === "competitor-miss"
}

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

/* ══════════════════════════════════════════════════════════════
 * Page
 * ══════════════════════════════════════════════════════════════ */

export default function IdeationPageWrapper() {
  return (
    <Suspense fallback={<div className="bpage">불러오는 중…</div>}>
      <IdeationPage />
    </Suspense>
  )
}

function IdeationPage() {
  const router = useRouter()

  /* ─── 3축 Compass 상태 ─────────────────────────────────── */
  const [selectedIntents, setSelectedIntents] = useState<Set<Intent>>(new Set(["enable"]))
  const [selectedSegments, setSelectedSegments] = useState<Set<string>>(new Set(["student"]))
  const [selectedStages, setSelectedStages] = useState<Set<JourneyStage>>(
    new Set(["prepare", "arrive", "settle"])
  )
  const [selectedSeasons, setSelectedSeasons] = useState<Set<string>>(new Set())
  const [selectedTriggers, setSelectedTriggers] = useState<Set<string>>(new Set())
  const [selectedPains, setSelectedPains] = useState<Set<string>>(new Set())

  /* ─── 검색 ─────────────────────────────────────────────── */
  const [searchMode, setSearchMode] = useState<"sentence" | "keyword">("sentence")
  const [searchQuery, setSearchQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)

  /* ─── 생성 옵션 (프리셋으로만 조절) ───────────────────── */
  const [temperature, setTemperature] = useState(0.7)
  const [count, setCount] = useState(10)
  const [quality, setQuality] = useState<"flash" | "pro">("flash")

  type GenPreset = "focused" | "balanced" | "explore"
  const PRESETS: Record<GenPreset, { count: number; temp: number; label: string; emoji: string; sub: string; desc: string }> = {
    focused:  { count: 5,  temp: 0.3,  label: "추천만",  emoji: "🎯", sub: "5개 · 엄선",  desc: "가장 확실한 주제만 소수 정예" },
    balanced: { count: 10, temp: 0.7,  label: "균형",    emoji: "⚖️", sub: "10개 · 기본", desc: "실무 라운드용 적정량" },
    explore:  { count: 30, temp: 0.95, label: "탐색",    emoji: "🌊", sub: "30개 · 다양", desc: "갭 찾기·브레인스토밍" },
  }
  const activePreset: GenPreset | "custom" =
    count === PRESETS.focused.count && temperature === PRESETS.focused.temp ? "focused" :
    count === PRESETS.balanced.count && temperature === PRESETS.balanced.temp ? "balanced" :
    count === PRESETS.explore.count && temperature === PRESETS.explore.temp ? "explore" : "custom"

  const applyPreset = (p: GenPreset) => {
    setCount(PRESETS[p].count)
    setTemperature(PRESETS[p].temp)
  }

  /* ─── 상태 / 결과 ──────────────────────────────────────── */
  const [phase, setPhase] = useState<GenPhase>("idle")
  const [progress, setProgress] = useState(0)
  const [ideas, setIdeas] = useState<DbIdea[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [historyLoading, setHistoryLoading] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastRunMeta, setLastRunMeta] = useState<{
    count: number
    provider: string
    model: string
    durationMs: number
  } | null>(null)
  /* Phase 3 grounded — 이번 run 의 시장 신호 (UI 헤더에서만 사용, ideas 본문 X) */
  const [marketSignals, setMarketSignals] = useState<{
    text: string
    publishers: string[]
    generated_at: string
  } | null>(null)
  const [signalsExpanded, setSignalsExpanded] = useState(false)

  /* ─── 매트릭스 필터 ─────────────────────────────────────── */
  const [sortMode, setSortMode] = useState<"fit" | "volume" | "recent">("fit")
  const [showOnlySelected, setShowOnlySelected] = useState(false)
  const [showOnlyHot, setShowOnlyHot] = useState(false)

  /* ─── 토글 헬퍼 ─────────────────────────────────────────── */
  function toggleSet<T>(set: Set<T>, v: T, setter: (s: Set<T>) => void) {
    const n = new Set(set)
    if (n.has(v)) n.delete(v)
    else n.add(v)
    setter(n)
  }

  /* ─── 자연어 힌트 적용 (문장 모드에서 의도 자동 반영) ─── */
  const applyHintsFromQuery = useCallback((q: string) => {
    if (!q.trim()) return
    const hints = guessAxesFromText(q)
    if (hints.intents.length > 0) {
      setSelectedIntents(new Set(hints.intents))
    }
    if (hints.stages.length > 0) {
      setSelectedStages(new Set(hints.stages))
    }
    if (hints.seasons.length > 0) {
      setSelectedSeasons((prev) => new Set([...prev, ...hints.seasons]))
    }
    if (hints.triggers.length > 0) {
      setSelectedTriggers((prev) => new Set([...prev, ...hints.triggers]))
    }
    if (hints.pains.length > 0) {
      setSelectedPains((prev) => new Set([...prev, ...hints.pains]))
    }
  }, [])

  /* ─── 정렬/필터된 ideas ─────────────────────────────────── */
  const visibleIdeas = useMemo(() => {
    let list = [...ideas]
    if (showOnlySelected) list = list.filter((i) => selectedIds.has(i.id))
    if (showOnlyHot) list = list.filter((i) => isHotSignal(i.signal?.kind))
    if (sortMode === "fit") list.sort((a, b) => (b.fit_score ?? 0) - (a.fit_score ?? 0))
    else if (sortMode === "volume") list.sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0))
    else list.sort((a, b) => b.created_at.localeCompare(a.created_at))
    return list
  }, [ideas, showOnlySelected, showOnlyHot, selectedIds, sortMode])

  /* ─── 매트릭스 그룹핑 (여정 × 목적) ─────────────────────── */
  const matrixRows = useMemo(() => {
    const rows: JourneyStage[] =
      selectedStages.size > 0
        ? (JOURNEY_STAGES.filter((s) => selectedStages.has(s)) as JourneyStage[])
        : (JOURNEY_STAGES as readonly JourneyStage[]).slice()
    return rows
  }, [selectedStages])

  const matrixCols = useMemo(() => {
    const cols: Intent[] =
      selectedIntents.size > 0
        ? INTENT_ORDER.filter((i) => selectedIntents.has(i))
        : INTENT_ORDER.slice()
    return cols
  }, [selectedIntents])

  const matrixBuckets = useMemo(() => {
    const map = new Map<string, DbIdea[]>()
    for (const idea of visibleIdeas) {
      const stage = (idea.cluster ?? "consider") as JourneyStage
      const intent = (idea.signal?.intent ?? "discover") as Intent
      const key = `${stage}|${intent}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(idea)
    }
    return map
  }, [visibleIdeas])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  /* ─── 생성 ─────────────────────────────────────────────── */
  const handleGenerate = async () => {
    setError(null)
    setLastRunMeta(null)
    setPhase("calling-ai")
    setProgress(8)

    let tick = 0
    const timer = setInterval(() => {
      tick++
      setProgress((p) => Math.min(p + (tick < 10 ? 4 : 2), 92))
      if (tick === 12) setPhase("parsing")
      if (tick === 20) setPhase("saving")
    }, 1500)

    try {
      const body = {
        intents: Array.from(selectedIntents),
        segmentSlugs: Array.from(selectedSegments),
        journeyStages: Array.from(selectedStages),
        seasons: Array.from(selectedSeasons),
        lifeTriggers: Array.from(selectedTriggers),
        painTags: Array.from(selectedPains),
        searchQuery: searchQuery.trim() || undefined,
        searchMode: searchQuery.trim() ? searchMode : undefined,
        count,
        temperature,
        quality,
      }

      const j = await safeFetchJson<{
        ok: boolean
        result?: {
          count: number
          provider: string
          model: string
          durationMs: number
          ideas: DbIdea[]
          groundedSignals?: {
            text: string
            publishers: string[]
            generated_at: string
          } | null
        }
        error?: string
      }>("/api/ideation/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!j.ok || !j.result) throw new Error(j.error ?? "생성 실패")

      setLastRunMeta({
        count: j.result.count,
        provider: j.result.provider,
        model: j.result.model,
        durationMs: j.result.durationMs,
      })
      setMarketSignals(j.result.groundedSignals ?? null)
      const newIdeas = j.result.ideas
      setIdeas(newIdeas)
      setSelectedIds(new Set(newIdeas.map((i) => i.id)))
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
          ? "서버 응답이 너무 오래 걸렸어요. Gemini가 혼잡한 시간일 수 있습니다 — 1분 뒤 다시 시도해 보세요."
          : msg
      )
      setPhase("idle")
      setProgress(0)
    } finally {
      clearInterval(timer)
    }
  }

  /* ─── 이전 아이디어 불러오기 ──────────────────────────── */
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
      setSelectedIds(new Set(list.map((i) => i.id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류")
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  /* ─── Shortlist 승격 ──────────────────────────────────── */
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

  const phaseLabel: Record<GenPhase, string> = {
    idle: "",
    "calling-ai": "Gemini 에이전트에게 주제를 요청 중…",
    parsing: "응답을 분석하고 3축으로 분류 중…",
    saving: "DB에 아이디어를 저장 중…",
    done: "완료!",
  }

  const totalAxisCount =
    selectedIntents.size + selectedSegments.size + selectedStages.size +
    selectedSeasons.size + selectedTriggers.size + selectedPains.size

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 02 · IDEATION"
        title="아이데이션 — 3축 Compass"
        sub="목적·세그먼트·상황 3축으로 주제를 생성하고, 여정×목적 매트릭스에서 이번 라운드에 쓸 주제를 선정합니다."
        actions={[
          {
            label: "← 키워드 트렌드",
            href: "/blog/research",
          },
          {
            label: "브리프 작성으로 →",
            primary: true,
            href: "/blog/topics",
          },
        ]}
      />

      {error && (
        <div className="err-banner">
          <span>⚠️</span>
          <span style={{ flex: 1, lineHeight: 1.5 }}>{error}</span>
          <button onClick={() => setError(null)} className="err-x">✕</button>
        </div>
      )}

      <div className="ideation-grid">
        {/* ═══════════════════════════════════════════════════════
           LEFT: 3-axis Compass
           ═══════════════════════════════════════════════════════ */}
        <aside className="bcard compass-card">
          <div className="bcard__header">
            <div className="bcard__title">콘텐츠 컴파스</div>
            <span className="bchip bchip--brand" style={{ marginLeft: "auto" }}>
              {totalAxisCount}개 선택
            </span>
          </div>

          {/* ① 세그먼트 */}
          <div className="compass-section">
            <div className="compass-label">
              <span>① 세그먼트 (Who)</span>
              <span className="compass-label__count">{selectedSegments.size} 선택</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {PERSONAS.map((p) => {
                const on = selectedSegments.has(p.id)
                return (
                  <label
                    key={p.id}
                    className={`seg-row${on ? " seg-row--on" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleSet(selectedSegments, p.id, setSelectedSegments)}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="seg-name">{p.label}</div>
                      <div className="seg-desc">{p.desc}</div>
                    </div>
                    <span className="seg-meta">{Math.round(p.match * 100)}%</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* ② 여정 */}
          <div className="compass-section">
            <div className="compass-label">
              <span>② 여정 (Journey)</span>
              <span className="compass-label__count">
                {selectedStages.size + selectedSeasons.size + selectedTriggers.size + selectedPains.size} 선택
              </span>
            </div>

            <div className="tag-group-label">
              여정 단계 <span className="tag-group-sub">· 게스트가 어디쯤 · 8단계</span>
            </div>
            <div className="tag-cloud">
              {(JOURNEY_STAGES as readonly JourneyStage[]).map((s) => {
                const d = STAGE_DEFS[s]
                const on = selectedStages.has(s)
                return (
                  <span
                    key={s}
                    className={`tag${on ? " tag--on" : ""}`}
                    title={d.shortDesc}
                    onClick={() => toggleSet(selectedStages, s, setSelectedStages)}
                  >
                    {d.ko} <span className="tag__sub">· {d.en}</span>
                  </span>
                )
              })}
            </div>

            <div className="tag-group-label">
              시즌 <span className="tag-group-sub">· 달력 기반 타이밍</span>
            </div>
            <div className="tag-cloud">
              {SEASONS.map((s) => {
                const on = selectedSeasons.has(s.id)
                return (
                  <span
                    key={s.id}
                    className={`tag${s.evergreen ? " tag--evergreen" : ""}${on ? " tag--on" : ""}`}
                    title={s.hint}
                    onClick={() => toggleSet(selectedSeasons, s.id, setSelectedSeasons)}
                  >
                    {s.ko}
                  </span>
                )
              })}
            </div>

            <div className="tag-group-label">
              라이프 트리거 <span className="tag-group-sub">· 개인 상황</span>
            </div>
            <div className="tag-cloud">
              {LIFE_TRIGGERS.map((t) => {
                const on = selectedTriggers.has(t.id)
                return (
                  <span
                    key={t.id}
                    className={`tag${on ? " tag--on" : ""}`}
                    title={t.hint}
                    onClick={() => toggleSet(selectedTriggers, t.id, setSelectedTriggers)}
                  >
                    {t.ko}
                  </span>
                )
              })}
            </div>

            <div className="tag-group-label">
              Pain · 서비스 레버
            </div>
            <div className="tag-cloud">
              {PAIN_TAGS.map((p) => {
                const on = selectedPains.has(p.id)
                return (
                  <span
                    key={p.id}
                    className={`tag${on ? " tag--on" : ""}`}
                    title={p.isServiceLever ? "플라트 라이프 차별점과 연결 가능" : undefined}
                    onClick={() => toggleSet(selectedPains, p.id, setSelectedPains)}
                  >
                    {p.ko}
                    {p.isServiceLever && <span className="tag__lever"> ⭐</span>}
                  </span>
                )
              })}
            </div>
          </div>

          {/* ③ 목적 */}
          <div className="compass-section">
            <div className="compass-label">
              <span>③ 목적 (Intent)</span>
              <span className="compass-label__count">{selectedIntents.size} 선택</span>
            </div>
            <div className="intent-list">
              {INTENT_ORDER.map((id) => {
                const d = INTENT_DEFS[id]
                const on = selectedIntents.has(id)
                return (
                  <div
                    key={id}
                    className={`intent-row${on ? " intent-row--on" : ""}`}
                    onClick={() => toggleSet(selectedIntents, id, setSelectedIntents)}
                  >
                    <span className="intent-dot" style={{ background: d.color }} />
                    <span className="intent-emoji">{d.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="intent-name">
                        {d.ko}{" "}
                        <span className="intent-en">· {d.en}</span>
                      </div>
                      <div className="intent-desc">{d.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 생성 모드 프리셋만 — 실제 생성 CTA는 오른쪽 Plan 카드로 이동 */}
          <div className="compass-generate">
            <div className="preset-label">
              생성 모드
              {activePreset !== "custom" && (
                <span className="preset-active-hint">
                  · {PRESETS[activePreset].desc}
                </span>
              )}
            </div>
            <div className="preset-row">
              {(Object.keys(PRESETS) as GenPreset[]).map((p) => {
                const pd = PRESETS[p]
                const on = activePreset === p
                return (
                  <button
                    key={p}
                    type="button"
                    className={`preset-btn${on ? " preset-btn--on" : ""}`}
                    onClick={() => applyPreset(p)}
                    disabled={phase !== "idle" && phase !== "done"}
                    title={pd.desc}
                  >
                    <div className="preset-btn__emoji">{pd.emoji}</div>
                    <div className="preset-btn__label">{pd.label}</div>
                    <div className="preset-btn__sub">{pd.sub}</div>
                  </button>
                )
              })}
            </div>
            <div className="gen-sub" style={{ marginTop: 10 }}>
              생성 버튼은 오른쪽 → <b style={{ color: "var(--brand-600)" }}>Plan</b> 카드
            </div>
          </div>
        </aside>

        {/* ═══════════════════════════════════════════════════════
           RIGHT: Plan 카드 (요약 + 메인 CTA + 검색·고급 서브) + 매트릭스
           ═══════════════════════════════════════════════════════ */}
        <div className="right-col">
          {/* ── Plan 카드 ── */}
          <div className="bcard plan-card">
            <div className="plan-card__head">
              <span className="plan-card__eyebrow">📋 이 조건으로 주제를 생성합니다</span>
              <div className="plan-card__quality" role="group" aria-label="품질 모드">
                <button
                  type="button"
                  className={`quality-btn${quality === "flash" ? " quality-btn--on" : ""}`}
                  onClick={() => setQuality("flash")}
                  title="Gemini 2.5 Flash — 빠르고 저렴 (기본)"
                >
                  💨 Flash
                </button>
                <button
                  type="button"
                  className={`quality-btn${quality === "pro" ? " quality-btn--on" : ""}`}
                  onClick={() => setQuality("pro")}
                  title="Gemini 2.5 Pro — 느리지만 최고 품질"
                >
                  🧠 Pro
                </button>
              </div>
              <span className="plan-card__count">{count}개 · {PRESETS[activePreset === "custom" ? "balanced" : activePreset].label}</span>
            </div>

            {/* 3열 요약 그리드 (세그먼트 · 여정 · 목적) */}
            <div className="plan-grid">
              <div className="plan-col">
                <div className="plan-col__head">
                  <span className="plan-col__icon">👥</span>
                  <span className="plan-col__label">세그먼트</span>
                </div>
                <div className="plan-col__body">
                  {selectedSegments.size === 0 ? (
                    <span className="plan-col__empty">전체 밸런스</span>
                  ) : (
                    Array.from(selectedSegments).map((id) => (
                      <span key={id} className="plan-val">
                        {PERSONAS.find((p) => p.id === id)?.label ?? id}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="plan-col">
                <div className="plan-col__head">
                  <span className="plan-col__icon">📋</span>
                  <span className="plan-col__label">여정 단계</span>
                </div>
                <div className="plan-col__body">
                  {selectedStages.size === 0 ? (
                    <span className="plan-col__empty">8단계 고르게</span>
                  ) : (
                    Array.from(selectedStages).map((s) => (
                      <span key={s} className="plan-val">{STAGE_DEFS[s].ko}</span>
                    ))
                  )}
                </div>
              </div>

              <div className="plan-col">
                <div className="plan-col__head">
                  <span className="plan-col__icon">🎯</span>
                  <span className="plan-col__label">목적</span>
                </div>
                <div className="plan-col__body">
                  {selectedIntents.size === 0 ? (
                    <span className="plan-col__empty">5개 의도 고르게</span>
                  ) : (
                    Array.from(selectedIntents).map((i) => (
                      <span
                        key={i}
                        className="plan-val plan-val--intent"
                        style={{ borderColor: INTENT_DEFS[i].color }}
                      >
                        <span className="plan-val__dot" style={{ background: INTENT_DEFS[i].color }} />
                        {INTENT_DEFS[i].ko}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 보조 — 상황·레버 + 탐색어 (있을 때만) */}
            {(selectedSeasons.size > 0 || selectedTriggers.size > 0 || selectedPains.size > 0 || searchQuery.trim()) && (
              <div className="plan-sub">
                {(selectedSeasons.size > 0 || selectedTriggers.size > 0 || selectedPains.size > 0) && (
                  <div className="plan-sub__line">
                    <span className="plan-sub__label">🌗 상황·레버</span>
                    <div className="plan-sub__values">
                      {Array.from(selectedSeasons).map((id) => (
                        <span key={"s-" + id} className="plan-val plan-val--ctx">
                          {SEASONS.find((s) => s.id === id)?.ko ?? id}
                        </span>
                      ))}
                      {Array.from(selectedTriggers).map((id) => (
                        <span key={"t-" + id} className="plan-val plan-val--ctx">
                          {LIFE_TRIGGERS.find((t) => t.id === id)?.ko ?? id}
                        </span>
                      ))}
                      {Array.from(selectedPains).map((id) => {
                        const p = PAIN_TAGS.find((x) => x.id === id)
                        return (
                          <span key={"p-" + id} className="plan-val plan-val--pain">
                            {p?.ko ?? id}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
                {searchQuery.trim() && (
                  <div className="plan-sub__line">
                    <span className="plan-sub__label">🔍 탐색어</span>
                    <div className="plan-sub__values">
                      <span className="plan-val plan-val--search">
                        {searchQuery.length > 56 ? searchQuery.slice(0, 56) + "…" : searchQuery}
                        <button
                          type="button"
                          className="plan-val__x"
                          onClick={() => setSearchQuery("")}
                          aria-label="탐색어 제거"
                        >
                          ✕
                        </button>
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 메인 CTA */}
            <button
              className="bbtn bbtn--primary plan-card__cta"
              onClick={handleGenerate}
              disabled={phase !== "idle" && phase !== "done"}
            >
              {phase === "idle" || phase === "done" ? (
                <>
                  <Icon name="sparkles" size={16} />
                  <span>이 조건으로 <b>{count}개 주제</b> 생성</span>
                  <span className="plan-card__cta-arrow">→</span>
                </>
              ) : (
                <>
                  <Spinner />
                  <span style={{ marginLeft: 6 }}>{phaseLabel[phase]}</span>
                </>
              )}
            </button>

            {phase !== "idle" && phase !== "done" && (
              <div style={{ marginTop: 8 }}>
                <div className="bar-track" style={{ height: 4 }}>
                  <div className="bar-fill" style={{ width: `${progress}%`, transition: "width 1.2s linear" }} />
                </div>
              </div>
            )}

            {phase === "done" && lastRunMeta && (
              <div className="gen-done">
                ✓ {lastRunMeta.count}개 생성 · {lastRunMeta.model} · {(lastRunMeta.durationMs / 1000).toFixed(1)}s
              </div>
            )}

            {/* ── 서브: 탐색어 추가 (접힘) ── */}
            <div className="plan-extras">
              <button
                type="button"
                className="plan-extras__toggle"
                onClick={() => setSearchOpen((v) => !v)}
              >
                <span>🔍 특정 키워드·문장으로 좁히기 <span className="plan-extras__opt">(선택)</span></span>
                <span className="plan-extras__chev">{searchOpen ? "▴" : "▾"}</span>
              </button>
              {searchOpen && (
                <div className="plan-extras__body">
                  <div className="search-inline__head">
                    <span className="search-inline__sub">
                      {searchMode === "sentence"
                        ? "문장은 3축을 자동 추론 (포커스 벗어날 때 반영)"
                        : "키워드는 정확 매칭 기반 확장"}
                    </span>
                    <div className="search-inline__mode">
                      <button
                        className={searchMode === "sentence" ? "on" : ""}
                        onClick={() => setSearchMode("sentence")}
                      >문장</button>
                      <button
                        className={searchMode === "keyword" ? "on" : ""}
                        onClick={() => setSearchMode("keyword")}
                      >키워드</button>
                    </div>
                  </div>

                  <input
                    className="search-inline__input"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => {
                      if (searchMode === "sentence" && searchQuery.trim()) {
                        applyHintsFromQuery(searchQuery)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (searchMode === "sentence" && searchQuery.trim()) {
                          applyHintsFromQuery(searchQuery)
                        }
                        handleGenerate()
                      }
                    }}
                    placeholder={
                      searchMode === "sentence"
                        ? "예) 3월 입학 외국인 유학생이 보증금 없이 첫 달 숙소 구하는 법"
                        : "예) 보증금 0원 단기임대 ARC"
                    }
                  />

                  <div className="search-inline__hints">
                    <span className="search-inline__hints-label">예시:</span>
                    {(searchMode === "sentence"
                      ? [
                          "보증금 없이 단기임대 예약 가능한가",
                          "한달살기 가족 동반 성수동",
                          "재계약 할지 귀국할지 결정",
                        ]
                      : [
                          "ARC 발급 + 단기임대",
                          "no deposit Seoul short-term",
                          "보증금 0원 월세 시세",
                        ]
                    ).map((h) => (
                      <span
                        key={h}
                        className="search-inline__hint"
                        onClick={() => {
                          setSearchQuery(h)
                          if (searchMode === "sentence") applyHintsFromQuery(h)
                        }}
                      >
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* 매트릭스 */}
          <div className="bcard">
            <div className="bcard__header">
              <div>
                <div className="bcard__title">주제 매트릭스 — 여정 × 목적</div>
                <div className="bcard__sub">
                  {ideas.length > 0
                    ? `${selectedIds.size} / ${ideas.length}개 선택 · 빈 셀은 갭`
                    : "빈 상태 — 좌측 Compass 또는 🔍 검색으로 시작"}
                </div>
              </div>
              {ideas.length === 0 && (
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

            {/* Phase 3 grounded — 이번 run 의 시장 신호 (검색 기반).
                ※ ideas 본문엔 안 들어감, 이 헤더 박스에서만 검수자 참고용 */}
            {ideas.length > 0 && marketSignals && (
              <div
                style={{
                  margin: "12px 14px 0",
                  padding: "10px 12px",
                  background: "linear-gradient(180deg, #eef2ff 0%, #f5f3ff 100%)",
                  border: "1px solid #c7d2fe",
                  borderRadius: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setSignalsExpanded((v) => !v)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "transparent",
                    border: 0,
                    cursor: "pointer",
                    padding: 0,
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 14 }}>🔥</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#3730a3" }}>
                      Google Search 시장 신호 반영됨
                      <span style={{ fontSize: 10.5, color: "#6366f1", fontWeight: 500, marginLeft: 6 }}>
                        · 이번 30개 주제 생성 시 자동 참고
                      </span>
                    </div>
                    {marketSignals.publishers.length > 0 && (
                      <div style={{ fontSize: 10.5, color: "#4338ca", marginTop: 2 }}>
                        매체: {marketSignals.publishers.join(" · ")}
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: 11, color: "#4338ca" }}>
                    {signalsExpanded ? "접기 ▲" : "펼치기 ▼"}
                  </span>
                </button>
                {signalsExpanded && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "8px 10px",
                      background: "white",
                      border: "1px solid #ddd6fe",
                      borderRadius: 6,
                      fontSize: 11.5,
                      color: "#4338ca",
                      lineHeight: 1.7,
                      whiteSpace: "pre-wrap",
                      maxHeight: 200,
                      overflowY: "auto",
                    }}
                  >
                    {marketSignals.text}
                  </div>
                )}
              </div>
            )}

            {ideas.length > 0 && (
              <div className="matrix-toolbar">
                <span style={{ fontWeight: 600 }}>정렬:</span>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as "fit" | "volume" | "recent")}
                  style={{ padding: "2px 6px", borderRadius: 6, border: "1px solid var(--border-default)" }}
                >
                  <option value="fit">fit_score ↓</option>
                  <option value="volume">월검색량 ↓</option>
                  <option value="recent">최신순</option>
                </select>
                <span className="matrix-toolbar__sep"></span>
                <label>
                  <input
                    type="checkbox"
                    checked={showOnlySelected}
                    onChange={(e) => setShowOnlySelected(e.target.checked)}
                  />{" "}
                  선택만
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={showOnlyHot}
                    onChange={(e) => setShowOnlyHot(e.target.checked)}
                  />{" "}
                  🔥 Hot만
                </label>
              </div>
            )}

            {ideas.length === 0 && phase === "idle" && (
              <div className="matrix-empty">
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>✨</div>
                아직 생성된 주제가 없어요.
                <br />
                왼쪽 <b style={{ color: "var(--brand-600)" }}>Compass</b> 또는 상단{" "}
                <b style={{ color: "var(--brand-600)" }}>🔍 검색</b>에서 시작하세요.
              </div>
            )}

            {phase !== "idle" && phase !== "done" && ideas.length === 0 && (
              <div className="matrix-empty">
                <div style={{ marginBottom: 12 }}><Spinner size={28} /></div>
                {phaseLabel[phase]}
              </div>
            )}

            {ideas.length > 0 && (
              <div
                className="matrix-grid"
                style={{
                  gridTemplateColumns: `90px repeat(${matrixCols.length}, minmax(140px, 1fr))`,
                }}
              >
                {/* 컬럼 헤더 */}
                <div className="matrix-head matrix-head--corner">
                  <div>여정 ＼ 목적</div>
                  <div className="matrix-head__sub">행=단계 · 열=의도</div>
                </div>
                {matrixCols.map((id) => {
                  const d = INTENT_DEFS[id]
                  return (
                    <div key={id} className="matrix-head">
                      <span className="matrix-head__dot" style={{ background: d.color }} />
                      <div>{d.emoji} {d.ko}</div>
                      <div className="matrix-head__sub">{d.desc.split("—")[0]?.trim()}</div>
                    </div>
                  )
                })}

                {/* 행 */}
                {matrixRows.map((stage) => {
                  const stageDef = STAGE_DEFS[stage]
                  return (
                    <div key={stage} style={{ display: "contents" }}>
                      <div className="matrix-rowhead">
                        <div>{stageDef.ko}</div>
                        <div className="matrix-rowhead__sub">{stageDef.en} · {stageDef.shortDesc}</div>
                      </div>
                      {matrixCols.map((intent) => {
                        const cellIdeas = matrixBuckets.get(`${stage}|${intent}`) ?? []
                        return (
                          <div key={intent} className="matrix-cell">
                            {cellIdeas.length === 0 ? (
                              <div className="matrix-empty-cell">— 갭 —</div>
                            ) : (
                              cellIdeas.map((idea) => {
                                const score = idea.fit_score ?? 0
                                const hot = isHotSignal(idea.signal?.kind)
                                const on = selectedIds.has(idea.id)
                                return (
                                  <div
                                    key={idea.id}
                                    className={`tcard${on ? " tcard--on" : ""}`}
                                    onClick={() => toggleSelect(idea.id)}
                                    title={idea.rationale ?? undefined}
                                  >
                                    <div
                                      className="tcard__score"
                                      style={{
                                        background: `conic-gradient(var(--brand-500) ${score * 3.6}deg, var(--bg-muted) 0)`,
                                      }}
                                    >
                                      <div className="tcard__score-inner">{score}</div>
                                    </div>
                                    <div className="tcard__title">
                                      {hot && <span className="tcard__fire">🔥</span>}
                                      {idea.title}
                                      <div className="tcard__meta">
                                        <span className="tcard__vol">{formatVolume(idea.volume)}/월</span>
                                        {idea.signal?.kind && (
                                          <span className="tcard__sig">{idea.signal.kind}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}

            {ideas.length > 0 && (
              <div className="selection-bar">
                <div>
                  <span className="selection-bar__count">{selectedIds.size}</span>
                  <span style={{ color: "var(--text-muted)" }}> / {ideas.length}개 선택</span>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  <button
                    className="bbtn bbtn--subtle"
                    onClick={() => {
                      setIdeas([])
                      setSelectedIds(new Set())
                    }}
                    disabled={promoting}
                  >
                    화면 비우기
                  </button>
                  <button
                    className="bbtn bbtn--primary"
                    onClick={promoteAndGoToFunnel}
                    disabled={selectedIds.size === 0 || promoting}
                  >
                    {promoting ? (
                      <>
                        <Spinner />
                        <span style={{ marginLeft: 4 }}>넘기는 중…</span>
                      </>
                    ) : (
                      <>
                        {selectedIds.size}개 → 브리프 작성으로 <Icon name="chevron" size={12} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .bpage :global(.ideation-grid) {
          display: grid;
          grid-template-columns: 320px 1fr;
          gap: 14px;
          align-items: start;
        }
        @media (max-width: 1180px) {
          .bpage :global(.ideation-grid) { grid-template-columns: 1fr; }
        }

        /* ── 왼쪽 Compass ────────────────────────────── */
        .compass-card {
          position: sticky;
          top: 12px;
          max-height: calc(100vh - 24px);
          overflow-y: auto;
        }
        .compass-section {
          padding: 14px 16px;
          border-top: 1px solid var(--border-subtle);
        }
        .compass-label {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .compass-label__count {
          margin-left: auto;
          font-size: 10px;
          color: var(--brand-700);
          background: var(--brand-50);
          border: 1px solid var(--brand-200);
          padding: 1px 6px;
          border-radius: 999px;
        }

        .intent-list { display: flex; flex-direction: column; gap: 3px; }
        .intent-row {
          display: flex;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 10px;
          cursor: pointer;
          border: 1px solid transparent;
          align-items: flex-start;
        }
        .intent-row:hover { background: var(--bg-subtle); }
        .intent-row--on {
          background: var(--brand-50);
          border-color: var(--brand-200);
        }
        .intent-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          margin-top: 6px;
          flex-shrink: 0;
        }
        .intent-emoji { font-size: 15px; width: 20px; text-align: center; flex-shrink: 0; line-height: 1.3; }
        .intent-name { font-weight: 700; font-size: 12.5px; }
        .intent-en { font-size: 10px; color: var(--text-muted); font-weight: 500; }
        .intent-desc { font-size: 11px; color: var(--text-muted); margin-top: 1px; }

        .seg-row {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 6px 8px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
        }
        .seg-row:hover { background: var(--bg-subtle); }
        .seg-row--on { background: var(--brand-50); }
        .seg-row input { accent-color: var(--brand-600); }
        .seg-name { font-weight: 600; }
        .seg-desc { font-size: 10.5px; color: var(--text-muted); }
        .seg-meta { font-size: 10.5px; color: var(--text-muted); margin-left: auto; }

        .tag-group-label {
          font-size: 11px;
          color: var(--text-muted);
          margin: 10px 0 6px;
          font-weight: 600;
        }
        .tag-group-sub { color: var(--text-muted); font-weight: 400; }
        .tag-cloud { display: flex; flex-wrap: wrap; gap: 5px; }
        .tag {
          font-size: 11px;
          padding: 4px 9px;
          border-radius: 999px;
          cursor: pointer;
          background: white;
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
          user-select: none;
        }
        .tag:hover { border-color: var(--brand-200); }
        .tag--on {
          background: var(--brand-600);
          color: white;
          border-color: var(--brand-600);
        }
        .tag__sub { opacity: 0.7; }
        .tag--evergreen {
          border-style: dashed;
          border-color: var(--border-strong);
          color: var(--text-secondary);
        }
        .tag--evergreen.tag--on { background: #111827; color: white; border-color: #111827; border-style: solid; }
        .tag--evergreen::before { content: "∞ "; opacity: 0.7; }
        .tag__lever { font-size: 9px; }

        .compass-generate {
          padding: 14px 16px;
          border-top: 1px solid var(--border-subtle);
          background: var(--bg-subtle);
          position: sticky;
          bottom: 0;
        }
        .preset-label {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .preset-active-hint {
          font-size: 10px;
          color: var(--brand-600);
          font-weight: 600;
          text-transform: none;
          letter-spacing: 0;
        }
        .preset-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        .preset-btn {
          padding: 7px 4px 6px;
          border-radius: 8px;
          border: 1px solid var(--border-default);
          background: white;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          transition: all 0.12s;
        }
        .preset-btn:hover:not(:disabled) { border-color: var(--brand-200); background: var(--brand-50); }
        .preset-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .preset-btn--on {
          background: var(--brand-50);
          border-color: var(--brand-500);
          box-shadow: 0 0 0 1px var(--brand-500) inset;
        }
        .preset-btn__emoji { font-size: 16px; line-height: 1.1; }
        .preset-btn__label { font-size: 11.5px; font-weight: 700; color: var(--text-primary); }
        .preset-btn__sub { font-size: 10px; color: var(--text-muted); font-weight: 500; }
        .gen-done {
          margin-top: 8px;
          padding: 6px 10px;
          background: var(--success-bg);
          border: 1px solid var(--success-border);
          border-radius: var(--r-md);
          font-size: 11px;
          color: var(--success-fg);
        }
        .gen-sub {
          margin-top: 8px;
          font-size: 10.5px;
          color: var(--text-muted);
          text-align: center;
        }

        /* ── 오른쪽 칼럼 ──────────────────────────── */
        .right-col { display: flex; flex-direction: column; gap: 14px; }

        /* ── Plan 카드 ─────────────────────────────── */
        .plan-card {
          padding: 18px 20px 20px;
          background: linear-gradient(180deg, var(--brand-50) 0%, var(--bg-surface) 60%);
          border-color: var(--brand-200);
        }
        .plan-card__head {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }
        .plan-card__eyebrow {
          font-size: 11px;
          font-weight: 700;
          color: var(--brand-700);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }
        .plan-card__count {
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-secondary);
          background: white;
          border: 1px solid var(--brand-200);
          padding: 3px 9px;
          border-radius: 999px;
        }
        .plan-card__quality {
          margin-left: auto;
          display: inline-flex;
          background: white;
          border: 1px solid var(--brand-200);
          border-radius: 999px;
          padding: 2px;
        }
        .quality-btn {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 10px;
          border: 0;
          background: transparent;
          border-radius: 999px;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .quality-btn:hover:not(.quality-btn--on) { color: var(--brand-600); }
        .quality-btn--on {
          background: var(--brand-600);
          color: white;
        }

        /* 3열 그리드 */
        .plan-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          background: white;
          border: 1px solid var(--border-default);
          border-radius: var(--r-md);
          overflow: hidden;
          margin-bottom: 12px;
        }
        .plan-col {
          padding: 12px 14px;
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 0;
        }
        .plan-col:last-child { border-right: 0; }
        .plan-col__head {
          display: flex;
          align-items: center;
          gap: 6px;
          padding-bottom: 6px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .plan-col__icon { font-size: 13px; line-height: 1; }
        .plan-col__label {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .plan-col__body {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          align-content: flex-start;
          min-height: 22px;
        }
        .plan-col__empty {
          font-size: 11.5px;
          color: var(--text-muted);
          font-style: italic;
        }

        .plan-val {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.3;
          background: var(--bg-subtle);
          color: var(--text-primary);
          border: 1px solid var(--border-default);
        }
        .plan-val--intent { background: white; border-width: 1.5px; }
        .plan-val--ctx { background: #fffbeb; border-color: #fde68a; color: #92400e; }
        .plan-val--pain { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
        .plan-val--search {
          background: #fff3f6;
          border-color: #ffc9d6;
          color: #9f1239;
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .plan-val__dot { width: 7px; height: 7px; border-radius: 999px; flex-shrink: 0; }
        .plan-val__x {
          background: transparent;
          border: 0;
          color: currentColor;
          cursor: pointer;
          font-size: 11px;
          padding: 0;
          margin-left: 2px;
          opacity: 0.7;
        }
        .plan-val__x:hover { opacity: 1; }

        /* 보조 라인 (상황·탐색어) */
        .plan-sub {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
          padding: 10px 12px;
          background: white;
          border: 1px solid var(--border-default);
          border-radius: var(--r-md);
        }
        .plan-sub__line {
          display: flex;
          gap: 10px;
          align-items: baseline;
          flex-wrap: wrap;
        }
        .plan-sub__label {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--text-muted);
          letter-spacing: 0.04em;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .plan-sub__values { display: flex; flex-wrap: wrap; gap: 4px; flex: 1; min-width: 0; }

        /* 메인 CTA */
        .plan-card__cta {
          width: 100%;
          padding: 14px 16px;
          font-size: 14px;
          font-weight: 700;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: var(--brand-600);
          color: white;
          border: 0;
          cursor: pointer;
          transition: background 0.12s, transform 0.12s;
        }
        .plan-card__cta:hover:not(:disabled) { background: var(--brand-700); }
        .plan-card__cta:active:not(:disabled) { transform: scale(0.99); }
        .plan-card__cta:disabled { opacity: 0.6; cursor: not-allowed; }
        .plan-card__cta-arrow { font-size: 14px; margin-left: 4px; }
        .plan-card__cta b { font-size: 15px; margin: 0 3px; }

        .gen-done {
          margin-top: 10px;
          padding: 6px 10px;
          background: var(--success-bg);
          border: 1px solid var(--success-border);
          border-radius: var(--r-md);
          font-size: 11.5px;
          color: var(--success-fg);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* extras — 접힘 섹션 */
        .plan-extras {
          margin-top: 12px;
          border-top: 1px solid var(--brand-200);
          padding-top: 10px;
        }
        .plan-extras__toggle {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 4px;
          background: none;
          border: 0;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
          color: var(--brand-700);
        }
        .plan-extras__toggle:hover { color: var(--brand-800); }
        .plan-extras__opt {
          font-size: 10.5px;
          color: var(--text-muted);
          font-weight: 500;
          margin-left: 2px;
        }
        .plan-extras__chev { font-size: 10px; color: var(--text-muted); }
        .plan-extras__body {
          padding: 8px 2px 6px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        /* inline search */
        .search-inline__head {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .search-inline__sub { font-size: 11px; color: var(--text-secondary); flex: 1; }
        .search-inline__mode {
          display: inline-flex;
          background: white;
          border: 1px solid var(--border-default);
          border-radius: 999px;
          padding: 2px;
        }
        .search-inline__mode button {
          font-size: 10.5px;
          font-weight: 600;
          padding: 4px 10px;
          border: 0;
          background: transparent;
          border-radius: 999px;
          cursor: pointer;
          color: var(--text-secondary);
        }
        .search-inline__mode button.on { background: var(--brand-600); color: white; }
        .search-inline__input {
          width: 100%;
          padding: 10px 12px;
          font-size: 13.5px;
          border-radius: 8px;
          border: 1px solid var(--border-default);
          background: white;
          font-family: inherit;
          color: var(--text-primary);
        }
        .search-inline__input:focus {
          outline: none;
          border-color: var(--brand-500);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }
        .search-inline__hints { display: flex; flex-wrap: wrap; gap: 5px; }
        .search-inline__hints-label {
          font-size: 10.5px;
          color: var(--text-muted);
          font-weight: 600;
          align-self: center;
          margin-right: 2px;
        }
        .search-inline__hint {
          font-size: 10.5px;
          padding: 3px 8px;
          border-radius: 999px;
          background: var(--bg-subtle);
          border: 1px solid var(--border-default);
          color: var(--text-secondary);
          cursor: pointer;
        }
        .search-inline__hint:hover { background: var(--brand-50); border-color: var(--brand-200); color: var(--brand-700); }

        /* 매트릭스 */
        .matrix-toolbar {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-subtle);
          font-size: 12px;
          flex-wrap: wrap;
        }
        .matrix-toolbar__sep {
          width: 1px;
          height: 14px;
          background: var(--border-default);
          margin: 0 2px;
        }
        .matrix-grid {
          display: grid;
          grid-auto-rows: auto;
          overflow-x: auto;
        }
        .matrix-head {
          padding: 8px 6px;
          text-align: center;
          font-size: 11px;
          font-weight: 700;
          background: var(--bg-subtle);
          border-bottom: 1px solid var(--border-default);
          border-right: 1px solid var(--border-default);
          display: flex;
          flex-direction: column;
          gap: 2px;
          align-items: center;
          justify-content: center;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .matrix-head--corner { background: var(--bg-subtle); }
        .matrix-head__sub { font-size: 9.5px; color: var(--text-muted); font-weight: 500; }
        .matrix-head__dot { width: 10px; height: 10px; border-radius: 999px; }

        .matrix-rowhead {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          padding: 8px 10px;
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary);
          background: var(--bg-subtle);
          border-right: 1px solid var(--border-default);
          border-bottom: 1px solid var(--border-subtle);
          min-height: 60px;
        }
        .matrix-rowhead__sub {
          font-size: 9.5px;
          color: var(--text-muted);
          font-weight: 500;
          margin-top: 2px;
        }
        .matrix-cell {
          border-right: 1px solid var(--border-subtle);
          border-bottom: 1px solid var(--border-subtle);
          padding: 6px;
          min-height: 60px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: var(--bg-surface);
        }

        .tcard {
          background: white;
          border: 1px solid var(--border-default);
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 11.5px;
          line-height: 1.35;
          cursor: pointer;
          display: flex;
          gap: 7px;
          align-items: flex-start;
          transition: border-color 0.12s, background 0.12s;
        }
        .tcard:hover { border-color: var(--brand-200); background: var(--brand-50); }
        .tcard--on {
          background: var(--brand-50);
          border-color: var(--brand-500);
          box-shadow: 0 0 0 1px var(--brand-500) inset;
        }
        .tcard__score {
          flex-shrink: 0;
          width: 20px;
          height: 20px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-family: ui-monospace, monospace;
          position: relative;
        }
        .tcard__score-inner {
          position: absolute;
          inset: 2px;
          background: white;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 9px;
          font-weight: 800;
        }
        .tcard__title { flex: 1; min-width: 0; word-break: break-word; }
        .tcard__fire { color: var(--accent-rose); font-size: 10px; margin-right: 2px; }
        .tcard__meta {
          margin-top: 3px;
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          font-size: 9.5px;
          color: var(--text-muted);
        }
        .tcard__vol { font-family: ui-monospace, monospace; }
        .tcard__sig { color: var(--text-muted); }

        .matrix-empty-cell {
          border: 1.5px dashed var(--border-strong);
          border-radius: 6px;
          padding: 6px;
          font-size: 10px;
          color: var(--text-muted);
          text-align: center;
        }

        .matrix-empty {
          padding: 48px 20px;
          text-align: center;
          color: var(--text-muted);
          font-size: 13px;
          line-height: 1.6;
        }

        .selection-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-top: 1px solid var(--border-subtle);
        }
        .selection-bar__count {
          font-size: 16px;
          font-weight: 800;
          color: var(--brand-700);
        }

        /* Error banner */
        .err-banner {
          margin-bottom: 16px;
          padding: 10px 14px;
          background: var(--danger-bg);
          border: 1px solid var(--danger-border);
          color: var(--danger-fg);
          border-radius: var(--r-md);
          font-size: 13px;
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }
        .err-x {
          font-size: 12px;
          color: var(--danger-fg);
          cursor: pointer;
          background: transparent;
          border: 0;
        }
      `}</style>

      <style>{`
        @keyframes ideation-spin { to { transform: rotate(360deg); } }
        .blog-shell .ideation-spinner {
          display: inline-block;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: ideation-spin 0.8s linear infinite;
        }
        .blog-shell :global(.ideation-spinner--dark) {
          border-color: rgba(99,102,241,0.15);
          border-top-color: var(--brand-600);
        }
      `}</style>
    </div>
  )
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      className="ideation-spinner"
      style={{ width: size, height: size }}
    />
  )
}

