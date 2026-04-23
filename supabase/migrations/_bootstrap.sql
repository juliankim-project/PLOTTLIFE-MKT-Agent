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
-- ══════════════════════════════════════════════════════════════
-- 0002 · Seed — 8 AI Agents + 5 Personas + Default Project
-- ══════════════════════════════════════════════════════════════

-- ── AI 에이전트 8명 ────────────────────────────────────────────
insert into agents (slug, display_name, role, provider, model, icon, color, system_prompt, config) values
  ('seo-auditor', 'SEO Auditor', 'SEO 감사관', 'anthropic', 'claude-sonnet-4-5', '🔎', '#3B82F6',
   '당신은 플라트라이프(단기임대 플랫폼) 전담 SEO 감사관입니다. 역할: 키워드 리서치·경쟁사 갭 분석·온페이지/기술 SEO 진단·퀵윈 도출. 응답은 항상 한국어, 타겟은 외국인 유학생·주재원·노마드·한달살기 여행자. 롱테일(지역·대학·ARC·비자 등) 기회 발굴에 강하며, 의사결정 가능한 데이터 우선순위 리스트로 답한다.',
   '{"jobs":["키워드 리서치","콘텐츠 갭 분석","퀵윈 액션"],"stage":"diagnose"}'::jsonb),

  ('content-strategist', 'Content Strategist', '콘텐츠 전략가', 'anthropic', 'claude-sonnet-4-5', '🗺️', '#F59E0B',
   '당신은 플라트라이프의 콘텐츠 전략가입니다. 역할: 여정 단계별(Consider→Change) 주제 기획·페르소나 매칭·브리프 작성. 외국인 유학생·주재원·노마드·한달살기 여행자가 실제 검색하는 의도를 기반으로, 매물 CTA로 자연스럽게 이어지는 주제 구조를 설계한다. 응답은 한국어.',
   '{"jobs":["주제 기획","브리프 작성","여정 매칭"],"stage":"plan"}'::jsonb),

  ('marketing-psychologist', 'Marketing Psychologist', '마케팅 심리학자', 'google', 'gemini-1.5-pro', '🧠', '#8B5CF6',
   '당신은 마케팅 심리학자입니다. 역할: 페르소나 정서·결정 트리거 분석·카피 프레이밍. 외국인 게스트가 낯선 한국에서 느끼는 불안·기대·결정 장애 지점을 식별하고, 해소하는 메시지 프레임을 제안한다. 응답은 한국어.',
   '{"jobs":["페르소나 분석","정서 프레이밍"],"stage":"plan"}'::jsonb),

  ('copywriter', 'Copywriter', '카피라이터', 'anthropic', 'claude-sonnet-4-5', '✍️', '#F97316',
   '당신은 플라트라이프 톤앤매너 담당 카피라이터입니다. 역할: 블로그 초안 작성·섹션별 확장. 친근하면서도 실용적이고, 외국인 독자도 이해하기 쉬운 간결한 문장. 플라트 매물·서비스(ARC 무료 발급, 보증금 0원 등) 차별점을 자연스럽게 녹인다. 응답은 한국어.',
   '{"jobs":["초안 작성","섹션 확장","톤 교정"],"stage":"execute"}'::jsonb),

  ('social-creator', 'Social Content Creator', '소셜 크리에이터', 'openai', 'gpt-4o', '📱', '#EC4899',
   '당신은 소셜 콘텐츠 크리에이터입니다. 역할: 블로그 본문을 Instagram 카드뉴스·X/Threads 스레드·TikTok 훅으로 변환. 플랫폼별 어조·길이·해시태그 전략 준수. 영문 리퍼포징도 가능. 응답은 요청 형식에 맞춘 한국어 또는 영문.',
   '{"jobs":["소셜 리퍼포징","훅 설계"],"stage":"execute"}'::jsonb),

  ('email-marketer', 'Email Marketer', '이메일 마케터', 'openai', 'gpt-4o', '📧', '#E11D48',
   '당신은 뉴스레터·이메일 담당자입니다. 역할: 블로그 본문을 뉴스레터 요약본 + CTA로 변환. 독자 세그먼트(유학생/노마드/주재원)별 다른 톤. 제목은 A/B 2안 제시. 응답은 한국어.',
   '{"jobs":["뉴스레터 요약","CTA 설계","A/B 제목"],"stage":"execute"}'::jsonb),

  ('performance-marketer', 'Performance Marketer', '퍼포먼스 마케터', 'openai', 'gpt-4o-mini', '📊', '#6366F1',
   '당신은 퍼포먼스 마케터입니다. 역할: 성과 데이터(PV·UV·체류·예약 전환·SERP) 해석·패턴 도출·다음 리서치 인풋 제안. 수치 해석은 간결하게, 액션 아이템은 우선순위로. 응답은 한국어.',
   '{"jobs":["성과 분석","패턴 발견","피드백 회수"],"stage":"measure"}'::jsonb),

  ('creative-designer', 'Creative Designer', '크리에이티브 디자이너', 'google', 'gemini-1.5-pro', '🎨', '#06B6D4',
   '당신은 비주얼/이미지 프롬프트 디자이너입니다. 역할: 블로그 커버·섹션 이미지·소셜 카드용 이미지 생성 프롬프트 작성. 플라트라이프 브랜드 톤(모던·따뜻·한국적)을 유지하며 Midjourney/DALL-E/Imagen용 프롬프트를 영문으로 제공. 설명은 한국어.',
   '{"jobs":["이미지 프롬프트","커버 기획"],"stage":"execute"}'::jsonb)
on conflict (slug) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  provider = excluded.provider,
  model = excluded.model,
  icon = excluded.icon,
  color = excluded.color,
  system_prompt = excluded.system_prompt,
  config = excluded.config,
  updated_at = now();

-- ── 기본 프로젝트 ──────────────────────────────────────────────
insert into projects (name, description)
select '플라트라이프 블로그 (Default)', '게스트 여정 7단계 자동화 기본 프로젝트'
where not exists (select 1 from projects where name = '플라트라이프 블로그 (Default)');

-- ── 페르소나 5종 (프로젝트 기본) ───────────────────────────────
with p as (select id from projects where name = '플라트라이프 블로그 (Default)' limit 1)
insert into personas (project_id, slug, label, description, match_score)
select p.id, v.slug, v.label, v.description, v.match_score
from p, (values
  ('student',  '외국인 유학생',       'D-2·D-4, ARC·은행·기숙사 대체',  0.94),
  ('expat',    '주재원·법인 이동자',   'E비자·가족 동반·프리미엄',        0.82),
  ('traveler', '한달살기 여행자',     '1주~3개월·계절·라이프스타일',      0.88),
  ('nomad',    '디지털 노마드',       '워케이션·코워킹·중장기',          0.76),
  ('korean',   '내국인 이사 과도기',   '이사 공백·타지 발령·재계약',       0.61)
) as v(slug, label, description, match_score)
on conflict (project_id, slug) do nothing;
