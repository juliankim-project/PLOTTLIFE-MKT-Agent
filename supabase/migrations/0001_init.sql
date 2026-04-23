-- ══════════════════════════════════════════════════════════════
-- 0001 · Blog Automation Pipeline — Core Schema
-- ══════════════════════════════════════════════════════════════
-- 게스트 여정 7단계(Research→Analyze)를 지원하는 테이블 세트.
-- 모든 접근은 Next.js API route를 통해 service_role로 이뤄진다.
-- 클라이언트 직접 접근은 없으므로 RLS는 deny-all 기본값.
-- ══════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── Projects ──────────────────────────────────────────────────
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Personas (페르소나) ───────────────────────────────────────
create table if not exists personas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  slug text not null,
  label text not null,
  description text,
  match_score numeric(3,2) default 0.8,
  created_at timestamptz not null default now(),
  unique (project_id, slug)
);

-- ── Agents (AI 에이전트 정의) ─────────────────────────────────
create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,               -- 'seo-auditor', 'copywriter' etc
  display_name text not null,
  role text not null,                       -- 한글 역할명
  provider text not null check (provider in ('anthropic', 'openai', 'google')),
  model text not null,                      -- 'claude-sonnet-4-5', 'gpt-4o' etc
  system_prompt text not null,
  config jsonb not null default '{}'::jsonb,
  icon text,
  color text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Research Sources (01단계 인풋) ────────────────────────────
create table if not exists research_sources (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in ('trend','competitor','self','community','reviews','custom')),
  label text not null,
  url text,
  data jsonb not null default '{}'::jsonb,  -- keyword data, metrics, etc
  collected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_research_project on research_sources(project_id);

-- ── Ideation Runs (02단계 생성 기록) ──────────────────────────
create table if not exists ideation_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  persona_id uuid references personas(id) on delete set null,
  source_ids uuid[] not null default '{}',
  params jsonb not null default '{}'::jsonb,  -- temperature, count, etc
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed')),
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_ideation_project on ideation_runs(project_id);

-- ── Ideas (02단계 산출 토픽) ──────────────────────────────────
create table if not exists ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  ideation_run_id uuid references ideation_runs(id) on delete set null,
  title text not null,
  cluster text,                              -- consider/prepare/... 여정 stage
  persona_id uuid references personas(id) on delete set null,
  rationale text,
  volume integer,
  fit_score integer check (fit_score between 0 and 100),
  signal jsonb,                              -- {kind:'seo-gap', detail:'...'}
  related_keywords text[] default '{}',
  status text not null default 'draft' check (status in ('draft','shortlisted','discarded','promoted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_ideas_project on ideas(project_id);
create index if not exists idx_ideas_status on ideas(status);

-- ── Topics (03단계 최종 선정) ─────────────────────────────────
create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  idea_id uuid not null references ideas(id) on delete cascade,
  score jsonb not null,                     -- {vol, comp, season, persona, brand, total}
  rank integer,                              -- 1..3 for final
  stage_limit text check (stage_limit in ('pool','10','5','3')),
  brief text,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, idea_id)
);
create index if not exists idx_topics_project on topics(project_id);

-- ── Drafts (04단계 작성) ──────────────────────────────────────
create table if not exists drafts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  topic_id uuid references topics(id) on delete set null,
  title text not null,
  slug text,
  content_type text,                        -- region-guide, seo-longtail, etc
  target_kpi text check (target_kpi in ('conversion','traffic','dwell_time')),
  primary_keyword text,
  secondary_keywords text[] default '{}',
  outline jsonb default '[]'::jsonb,        -- [{heading, bullets:[]}]
  body_markdown text,
  hero_image_prompt text,
  hero_image_url text,
  metadata jsonb default '{}'::jsonb,
  status text not null default 'drafting' check (status in ('drafting','reviewing','approved','published','rewriting','discarded')),
  progress_pct integer default 0 check (progress_pct between 0 and 100),
  assigned_agent_id uuid references agents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_drafts_project on drafts(project_id);
create index if not exists idx_drafts_status on drafts(status);

-- ── Reviews (05단계 검수) ─────────────────────────────────────
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  draft_id uuid not null references drafts(id) on delete cascade,
  items jsonb not null,                     -- [{cat, label, ok, message}]
  overall_score integer check (overall_score between 0 and 100),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewer text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_reviews_draft on reviews(draft_id);

-- ── Publications (06단계 발행) ────────────────────────────────
create table if not exists publications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  draft_id uuid not null references drafts(id) on delete cascade,
  channel text not null check (channel in ('official','naver','newsletter','medium','instagram','x','threads','custom')),
  format text,
  content text,                              -- 채널별 변환본
  scheduled_at timestamptz,
  published_at timestamptz,
  url text,
  status text not null default 'scheduled' check (status in ('scheduled','publishing','published','failed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_publications_draft on publications(draft_id);

-- ── Metrics (07단계 성과) ─────────────────────────────────────
create table if not exists metrics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  publication_id uuid references publications(id) on delete cascade,
  draft_id uuid references drafts(id) on delete cascade,
  measured_at date not null default current_date,
  source text,                               -- ga4, search-console, manual
  data jsonb not null,                       -- {pv, uv, dwell_sec, scroll_pct, cta_clicks, bookings, serp_rank, top_queries}
  created_at timestamptz not null default now()
);
create index if not exists idx_metrics_pub on metrics(publication_id);
create index if not exists idx_metrics_date on metrics(measured_at);

-- ── Agent Runs (모든 에이전트 실행 로그) ──────────────────────
create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete set null,
  agent_id uuid references agents(id) on delete set null,
  stage text check (stage in ('research','ideation','topic','write','review','publish','analyze')),
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  status text not null default 'queued' check (status in ('queued','running','succeeded','failed')),
  error text,
  provider text,
  model text,
  input_tokens integer,
  output_tokens integer,
  duration_ms integer,
  cost_usd numeric(10,6),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_runs_project on agent_runs(project_id);
create index if not exists idx_runs_agent on agent_runs(agent_id);
create index if not exists idx_runs_created on agent_runs(created_at desc);

-- ══════════════════════════════════════════════════════════════
-- updated_at 자동 갱신
-- ══════════════════════════════════════════════════════════════
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'projects','agents','ideas','drafts','publications'
  ])
  loop
    execute format(
      'drop trigger if exists trg_%1$s_updated on %1$s;
       create trigger trg_%1$s_updated before update on %1$s
         for each row execute function set_updated_at();',
      t
    );
  end loop;
end $$;

-- ══════════════════════════════════════════════════════════════
-- RLS — 클라이언트는 anon 접근 불가. 오직 service_role만 허용.
-- ══════════════════════════════════════════════════════════════
alter table projects          enable row level security;
alter table personas          enable row level security;
alter table agents            enable row level security;
alter table research_sources  enable row level security;
alter table ideation_runs     enable row level security;
alter table ideas             enable row level security;
alter table topics            enable row level security;
alter table drafts            enable row level security;
alter table reviews           enable row level security;
alter table publications      enable row level security;
alter table metrics           enable row level security;
alter table agent_runs        enable row level security;

-- 기본 policy 없음 → anon은 아무 행도 접근 불가 (deny-all)
-- service_role은 RLS를 우회하므로 서버 API route에서 자유롭게 CRUD.
