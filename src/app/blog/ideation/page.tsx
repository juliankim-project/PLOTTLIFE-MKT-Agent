"use client"

import { useCallback, useEffect, useState } from "react"
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
  consider: "Consider",
  prepare: "Prepare",
  arrive: "Arrive",
  settle: "Settle",
  live: "Live",
  explore: "Explore",
  change: "Change",
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

  const [generating, setGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [ideas, setIdeas] = useState<DbIdea[]>([])
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

  // 최초 로드 — DB에서 기존 아이디어 가져오기
  const loadIdeas = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/ideation/ideas?limit=50", { cache: "no-store" })
      const j = await r.json()
      if (j.ok) setIdeas(j.ideas as DbIdea[])
      else setError(j.error ?? "불러오기 실패")
    } catch (e) {
      setError(e instanceof Error ? e.message : "네트워크 오류")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadIdeas()
  }, [loadIdeas])

  // 실제 AI 호출
  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const persona = PERSONAS.find((p) => p.id === selectedPersona)
      const researchContext = [
        `선택된 인풋 소스: ${Array.from(selectedInputs)
          .map((id) => INPUTS.find((x) => x.id === id)?.label)
          .filter(Boolean)
          .join(", ")}`,
        `\n사용자 가이드:\n${prompt}`,
      ].join("\n")

      const r = await fetch("/api/ideation/run", {
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
      const j = await r.json()
      if (!j.ok) throw new Error(j.error ?? `status ${r.status}`)

      setLastRunMeta({
        count: j.result.count,
        provider: j.result.provider,
        model: j.result.model,
        durationMs: j.result.durationMs,
      })
      // 갓 생성된 ideas를 맨 위로 + 기존 뒤에 유지
      setIdeas((prev) => [...(j.result.ideas as DbIdea[]), ...prev])
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="bpage fade-up">
      <PageHeader
        eyebrow="STAGE 02 · IDEATION"
        title="아이데이션"
        sub="수집된 인풋을 연결해 AI가 30~50개의 단기임대 토픽 아이디어를 확장 생성합니다. 게스트 여정 단계별 클러스터로 묶여 다음 단계 퍼널로 넘어갑니다."
        actions={[{ label: "주제선정으로 →", primary: true, onClick: () => router.push("/blog/topics") }]}
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
          ⚠️ {error}
          <button
            onClick={() => setError(null)}
            style={{ marginLeft: "auto", fontSize: 12, color: "var(--danger-fg)" }}
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
              Gemini 1.5 Pro · Plott Blog Ideator
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
                  <span
                    className="text-mono"
                    style={{ fontSize: 12, fontWeight: 600, minWidth: 28 }}
                  >
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
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "7px 10px",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-md)",
                    background: "white",
                  }}
                >
                  <option value={10}>10개</option>
                  <option value={20}>20개</option>
                  <option value={30}>30개</option>
                  <option value={50}>50개</option>
                </select>
              </div>
            </div>

            <button
              className="bbtn bbtn--primary bbtn--lg"
              style={{ width: "100%", marginTop: 16 }}
              onClick={handleGenerate}
              disabled={generating}
            >
              <Icon name="sparkles" size={15} />
              {generating ? "생성 중… (10~30초)" : "아이디어 생성"}
            </button>

            {lastRunMeta && (
              <div
                style={{
                  marginTop: 10,
                  padding: "8px 10px",
                  background: "var(--success-bg)",
                  border: "1px solid var(--success-border)",
                  borderRadius: "var(--r-md)",
                  fontSize: 11.5,
                  color: "var(--success-fg)",
                }}
              >
                ✓ {lastRunMeta.count}개 생성 · {lastRunMeta.provider} · {lastRunMeta.model} ·{" "}
                {(lastRunMeta.durationMs / 1000).toFixed(1)}s
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
                {loading ? "불러오는 중…" : `${ideas.length}개 · DB 저장 완료`}
              </div>
            </div>
            <button
              className="bbtn bbtn--ghost bbtn--sm"
              style={{ marginLeft: "auto" }}
              onClick={loadIdeas}
              disabled={loading}
            >
              <Icon name="sort" size={12} /> 새로고침
            </button>
          </div>
          <div style={{ maxHeight: 560, overflowY: "auto" }}>
            {!loading && ideas.length === 0 && (
              <div
                style={{
                  padding: "28px 20px",
                  textAlign: "center",
                  fontSize: 12.5,
                  color: "var(--text-muted)",
                }}
              >
                아직 아이디어가 없어요. 좌측에서 인풋 선택하고 <b>아이디어 생성</b>을 눌러보세요.
              </div>
            )}

            {ideas.map((i) => {
              const clusterLabel = i.cluster ? CLUSTER_LABEL[i.cluster] ?? i.cluster : "—"
              const score = i.fit_score ?? 0
              const hot = isHotSignal(i.signal?.kind)
              const persona = "—" // 추후 PERSONAS 조인
              return (
                <div
                  key={i.id}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border-subtle)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                  }}
                >
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
                      <span className="bchip" style={{ color: "var(--text-muted)" }}>
                        {persona}
                      </span>
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
                  <button className="bbtn bbtn--ghost bbtn--sm" style={{ padding: "4px 6px" }}>
                    <Icon name="bookmark" size={12} />
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
            <button className="bbtn bbtn--subtle" style={{ flex: 1 }}>
              전체 선택
            </button>
            <button
              className="bbtn bbtn--primary"
              style={{ flex: 2 }}
              onClick={() => router.push("/blog/topics")}
              disabled={ideas.length === 0}
            >
              퍼널로 넘기기 <Icon name="chevron" size={12} />
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
          .blog-shell .ideation-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}
