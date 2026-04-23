"use client"

import { useState } from "react"
import {
  SPECIALISTS,
  SPECIALIST_WORKFLOW,
  STAGE_COLORS,
  type SkillSpecialist,
} from "@/lib/skill-specialists"
import { cn } from "@/lib/utils"

export default function AgentTeamPage() {
  const [selectedId, setSelectedId] = useState<string>(SPECIALISTS[0].id)
  const [stageFilter, setStageFilter] = useState<string | "all">("all")

  const selected = SPECIALISTS.find((s) => s.id === selectedId)!
  const filtered =
    stageFilter === "all"
      ? SPECIALISTS
      : SPECIALISTS.filter((s) => s.stage === stageFilter)

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-gray-500 mb-2">
                PLOTT MARKETING TEAM · AI AGENTS
              </p>
              <h1 className="text-3xl font-bold tracking-tight">스킬 에이전트 팀</h1>
              <p className="mt-2 text-sm text-gray-600 max-w-2xl">
                Corey Haines{" "}
                <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                  marketingskills
                </code>{" "}
                기반 마케팅 AI 에이전트 {SPECIALISTS.length}명. 각 페르소나는 검증된
                marketing skill 1개와 1:1 매핑되어 실행됩니다.
              </p>
            </div>
            <a
              href="https://skills.sh/coreyhaines31/marketingskills"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              skills.sh ↗
            </a>
          </div>

          {/* Stage filter */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <FilterChip
              active={stageFilter === "all"}
              onClick={() => setStageFilter("all")}
            >
              전체 · {SPECIALISTS.length}
            </FilterChip>
            {SPECIALIST_WORKFLOW.map((w) => {
              const count = SPECIALISTS.filter((s) => s.stage === w.stage).length
              const c = STAGE_COLORS[w.stage]
              return (
                <FilterChip
                  key={w.stage}
                  active={stageFilter === w.stage}
                  onClick={() => setStageFilter(w.stage)}
                  color={c}
                >
                  {w.label} · {count}
                </FilterChip>
              )
            })}
          </div>
        </div>
      </header>

      {/* Workflow strip */}
      <section className="border-b border-gray-100 bg-white/80">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 shrink-0">
              워크플로우
            </p>
            {SPECIALIST_WORKFLOW.map((w, i, arr) => {
              const c = STAGE_COLORS[w.stage]
              const leads = w.leads
                .map((id) => SPECIALISTS.find((s) => s.id === id))
                .filter(Boolean) as SkillSpecialist[]
              return (
                <div key={w.stage} className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => setStageFilter(w.stage)}
                    className="flex items-center gap-2 rounded-full border border-gray-200 bg-white pl-2 pr-3 py-1 hover:border-gray-400 transition-colors"
                  >
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium">{w.label}</span>
                    <div className="flex -space-x-1">
                      {leads.map((l) => (
                        <span
                          key={l.id}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] border-2 border-white"
                          style={{ background: l.bgColor }}
                          title={l.name}
                        >
                          {l.emoji}
                        </span>
                      ))}
                    </div>
                  </button>
                  {i < arr.length - 1 && <span className="text-gray-300">→</span>}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Main */}
      <div className="mx-auto max-w-6xl px-6 py-8 grid lg:grid-cols-[300px_1fr] gap-8">
        {/* List */}
        <aside>
          <div className="space-y-2">
            {filtered.map((s) => {
              const c = STAGE_COLORS[s.stage]
              return (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3 transition-all",
                    selectedId === s.id
                      ? "border-2 border-gray-900 bg-white shadow-md"
                      : "border-gray-200 bg-white hover:border-gray-400"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                      style={{ background: s.bgColor, color: s.color }}
                    >
                      {s.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="font-semibold text-sm">{s.name}</p>
                        <span className="text-[10px] text-gray-400">·</span>
                        <p className="text-[11px] text-gray-500 truncate">{s.title}</p>
                      </div>
                      <p className="text-[11px] text-gray-600 line-clamp-1">{s.tagline}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-medium rounded-full px-1.5 py-0.5"
                          style={{ background: c.bg, color: c.fg }}
                        >
                          {SPECIALIST_WORKFLOW.find((w) => w.stage === s.stage)?.label}
                        </span>
                        <span className="text-[10px] text-gray-400">{s.runsCount} runs</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </aside>

        {/* Detail */}
        <main>
          <SpecialistDetail specialist={selected} />
        </main>
      </div>
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean
  onClick: () => void
  color?: { bg: string; fg: string }
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium transition-colors border",
        active
          ? "bg-gray-900 text-white border-gray-900"
          : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
      )}
      style={
        active && color
          ? { background: color.fg, borderColor: color.fg }
          : undefined
      }
    >
      {children}
    </button>
  )
}

function SpecialistDetail({ specialist: s }: { specialist: SkillSpecialist }) {
  const stageInfo = SPECIALIST_WORKFLOW.find((w) => w.stage === s.stage)
  const stageColor = STAGE_COLORS[s.stage]

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
        <div
          className="h-2"
          style={{ background: `linear-gradient(90deg, ${s.color}, ${s.color}aa)` }}
        />
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0"
              style={{ background: s.bgColor, color: s.color }}
            >
              {s.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                  style={{ background: stageColor.bg, color: stageColor.fg }}
                >
                  STAGE · {stageInfo?.label}
                </span>
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5"
                  style={{ background: s.bgColor, color: s.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {s.status}
                </span>
                <span className="text-[11px] text-gray-500">
                  {s.runsCount} runs · last {s.lastRun}
                </span>
              </div>
              <h2 className="text-2xl font-bold">
                {s.name}{" "}
                <span className="text-gray-400 font-normal">·</span>{" "}
                <span className="text-lg text-gray-700 font-medium">{s.title}</span>
              </h2>
              <p className="mt-1 text-sm text-gray-600">{s.tagline}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-gray-500">
                <span>📦 marketingskills</span>
                <span className="text-gray-400">/</span>
                <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">
                  {s.skillSlug}
                </code>
              </div>
            </div>
            <a
              href={s.skillUrl}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              SKILL.md ↗
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-700 leading-relaxed">{s.description}</p>

          {/* PlottLife Fit */}
          <div
            className="mt-4 rounded-lg p-3 text-sm"
            style={{ background: s.bgColor }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-1"
              style={{ color: s.color }}
            >
              플라트라이프 적합도
            </p>
            <p className="text-gray-700">{s.plottFit}</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Jobs to be done" value={s.jobsToBeDone.length} />
        <StatCard label="샘플 프롬프트" value={s.sampleQuestions.length} />
        <StatCard label="산출물 타입" value={s.deliverables.length} />
      </div>

      {/* JTBD */}
      <Section title="이 에이전트가 하는 일" subtitle="Jobs to be done">
        <ul className="space-y-2">
          {s.jobsToBeDone.map((job, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span
                className="shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                style={{ background: s.bgColor, color: s.color }}
              >
                {i + 1}
              </span>
              <span>{job}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Sample prompts */}
      <Section title="이런 식으로 질문해보세요" subtitle="Sample prompts">
        <div className="space-y-2">
          {s.sampleQuestions.map((q, i) => (
            <div
              key={i}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 hover:border-gray-400 cursor-pointer flex items-center gap-2 group"
            >
              <span className="text-gray-400">→</span>
              <span className="flex-1">{q}</span>
              <span
                className="text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: s.color }}
              >
                실행
              </span>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid md:grid-cols-2 gap-4">
        <Section title="산출물" subtitle="Deliverables">
          <ul className="space-y-1.5 text-sm text-gray-700">
            {s.deliverables.map((d, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-gray-400">📋</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </Section>
        <Section title="언제 호출하나요" subtitle="Triggers">
          <ul className="space-y-1.5 text-sm text-gray-700">
            {s.triggers.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-gray-400">⚡</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* Footer action */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: s.bgColor }}
      >
        <div>
          <p
            className="text-[11px] font-bold uppercase tracking-wider mb-0.5"
            style={{ color: s.color }}
          >
            READY TO RUN
          </p>
          <p className="text-sm text-gray-700">
            지금 바로 <strong>{s.name}</strong>에게 작업을 맡겨보세요
          </p>
        </div>
        <button
          className="rounded-md px-4 py-2 text-sm font-semibold text-white"
          style={{ background: s.color }}
        >
          {s.emoji} 실행하기 →
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">
        {value}
        <span className="ml-0.5 text-sm text-gray-400 font-normal">개</span>
      </p>
    </div>
  )
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <div className="mb-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {subtitle}
        </p>
        <h3 className="text-base font-bold">{title}</h3>
      </div>
      {children}
    </div>
  )
}
