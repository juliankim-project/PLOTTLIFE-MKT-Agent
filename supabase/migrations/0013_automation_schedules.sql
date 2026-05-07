-- 자동화 스케줄 — 사용자가 화면에서 등록한 cron 일정.
-- /api/automation/cron-tick 이 매시간 호출되어 due 항목 실행.

create table if not exists automation_schedules (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  name text not null,
  /* cron 5-field UTC 표준 */
  cron_expression text not null,
  enabled boolean not null default true,
  /* 자동화 옵션 */
  forced_template text check (forced_template in ('steps','compare','story') or forced_template is null),
  quality text not null default 'flash' check (quality in ('flash','pro')),
  /* 실행 추적 */
  last_run_at timestamptz,
  last_run_status text check (last_run_status in ('succeeded','failed') or last_run_status is null),
  last_draft_id uuid,
  last_error text,
  next_run_at timestamptz,
  run_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists automation_schedules_project_idx on automation_schedules(project_id);
create index if not exists automation_schedules_due_idx on automation_schedules(next_run_at) where enabled = true;

comment on table automation_schedules is '사용자가 화면에서 등록한 자동 콘텐츠 생성 schedule';
comment on column automation_schedules.cron_expression is 'UTC 기준 5-field cron (e.g., "0 0 * * *" = 매일 KST 09:00)';
comment on column automation_schedules.next_run_at is 'cron 다음 실행 예정 시각 — cron-tick 이 자동 갱신';
