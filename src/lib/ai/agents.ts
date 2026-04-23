/**
 * Agent runner — DB에 저장된 agents 레코드를 읽어 실제 AI 호출을 수행.
 * 모든 호출은 agent_runs 테이블에 로그.
 */

import "server-only"
import { supabaseAdmin } from "@/lib/supabase/server"
import { complete, type Provider, type AIMessage } from "./provider"

export interface AgentRecord {
  id: string
  slug: string
  display_name: string
  role: string
  provider: Provider
  model: string
  system_prompt: string
  config: Record<string, unknown>
  icon: string | null
  color: string | null
}

export async function getAgent(slug: string): Promise<AgentRecord> {
  const db = supabaseAdmin()
  const { data, error } = await db.from("agents").select("*").eq("slug", slug).single()
  if (error) throw new Error(`agent not found: ${slug} (${error.message})`)
  return data as AgentRecord
}

export interface RunAgentInput {
  agentSlug: string
  /** 파이프라인 단계 — 로그용 */
  stage?: "research" | "ideation" | "topic" | "write" | "review" | "publish" | "analyze"
  projectId?: string
  /** 사용자 프롬프트 */
  prompt: string
  /** 추가 context (prompt 앞에 user 메시지로 붙음) */
  context?: string
  /** 온도·출력 토큰 등 덮어쓰기 */
  temperature?: number
  maxTokens?: number
  /** JSON 응답 강제 */
  json?: boolean
  /** 실행자 provider/model 덮어쓰기 (없으면 agent 기본) */
  providerOverride?: Provider
  modelOverride?: string
}

export interface RunAgentResult {
  runId: string
  agent: { slug: string; displayName: string; role: string }
  text: string
  json?: unknown
  provider: Provider
  model: string
  inputTokens?: number
  outputTokens?: number
  durationMs: number
}

/**
 * 에이전트 실행 — DB 로그까지 한 번에 처리.
 * 실패해도 agent_runs에 failed 로 기록한다.
 */
export async function runAgent(input: RunAgentInput): Promise<RunAgentResult> {
  const db = supabaseAdmin()
  const agent = await getAgent(input.agentSlug)
  const provider = input.providerOverride ?? agent.provider
  const model = input.modelOverride ?? agent.model
  const started = Date.now()

  // 로그 시작
  const { data: run, error: runErr } = await db
    .from("agent_runs")
    .insert({
      project_id: input.projectId ?? null,
      agent_id: agent.id,
      stage: input.stage ?? null,
      input: { prompt: input.prompt, context: input.context ?? null, params: {
        temperature: input.temperature, maxTokens: input.maxTokens, json: input.json,
      } },
      status: "running",
      provider,
      model,
    })
    .select("id")
    .single()
  if (runErr || !run) throw new Error(`agent_runs insert failed: ${runErr?.message}`)

  const messages: AIMessage[] = []
  if (input.context) messages.push({ role: "user", content: input.context })
  messages.push({ role: "user", content: input.prompt })

  try {
    const out = await complete({
      provider,
      model,
      system: agent.system_prompt,
      messages,
      temperature: input.temperature,
      max_tokens: input.maxTokens,
      json: input.json,
    })
    const durationMs = Date.now() - started
    let parsedJson: unknown = undefined
    if (input.json) {
      try {
        parsedJson = JSON.parse(out.text)
      } catch {
        // leave undefined; caller can choose to re-prompt
      }
    }

    await db
      .from("agent_runs")
      .update({
        status: "succeeded",
        output: { text: out.text, json: parsedJson ?? null },
        input_tokens: out.inputTokens ?? null,
        output_tokens: out.outputTokens ?? null,
        duration_ms: durationMs,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id)

    return {
      runId: run.id,
      agent: { slug: agent.slug, displayName: agent.display_name, role: agent.role },
      text: out.text,
      json: parsedJson,
      provider: out.provider,
      model: out.model,
      inputTokens: out.inputTokens,
      outputTokens: out.outputTokens,
      durationMs,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await db
      .from("agent_runs")
      .update({
        status: "failed",
        error: msg,
        duration_ms: Date.now() - started,
        completed_at: new Date().toISOString(),
      })
      .eq("id", run.id)
    throw err
  }
}
