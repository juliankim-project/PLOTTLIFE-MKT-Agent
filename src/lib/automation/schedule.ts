/**
 * 자동화 schedule 모듈 — cron 계산 + DB 액세스 헬퍼.
 */

import "server-only"
import { CronExpressionParser } from "cron-parser"

export type ScheduleQuality = "flash" | "pro"
export type ScheduleTemplate = "steps" | "compare" | "story" | null

export interface AutomationSchedule {
  id: string
  project_id: string
  name: string
  cron_expression: string
  enabled: boolean
  forced_template: ScheduleTemplate
  quality: ScheduleQuality
  last_run_at: string | null
  last_run_status: "succeeded" | "failed" | null
  last_draft_id: string | null
  last_error: string | null
  next_run_at: string | null
  run_count: number
  created_at: string
  updated_at: string
}

/** cron expression 검증 + 다음 실행 시각 계산 (UTC) */
export function nextRunFromCron(cronExpression: string, fromDate?: Date): Date {
  const it = CronExpressionParser.parse(cronExpression, {
    currentDate: fromDate ?? new Date(),
    tz: "UTC",
  })
  return it.next().toDate()
}

/** cron 검증만 — 잘못되면 throw */
export function validateCron(cronExpression: string): void {
  CronExpressionParser.parse(cronExpression, { tz: "UTC" })
}

/** UTC cron → 사람이 읽는 한국어 설명 (간단한 케이스만) */
export function describeCron(cronExpression: string): string {
  const m = cronExpression.trim().split(/\s+/)
  if (m.length !== 5) return cronExpression
  const [min, hour, dom, mon, dow] = m

  /* UTC → KST (UTC+9) 변환 */
  const toKstHour = (h: string) => {
    const n = parseInt(h, 10)
    if (Number.isNaN(n)) return h
    return String((n + 9) % 24).padStart(2, "0")
  }

  if (dom === "*" && mon === "*" && dow === "*") {
    if (/^\d+$/.test(hour) && /^\d+$/.test(min)) {
      return `매일 ${toKstHour(hour)}:${min.padStart(2, "0")} (KST)`
    }
    if (hour === "*" && /^\d+$/.test(min)) {
      return `매시 ${min.padStart(2, "0")}분`
    }
  }
  if (dom === "*" && mon === "*" && /^\d+$/.test(dow)) {
    const wd = ["일", "월", "화", "수", "목", "금", "토"][parseInt(dow, 10)] ?? dow
    if (/^\d+$/.test(hour) && /^\d+$/.test(min)) {
      return `매주 ${wd} ${toKstHour(hour)}:${min.padStart(2, "0")} (KST)`
    }
  }
  return cronExpression
}
