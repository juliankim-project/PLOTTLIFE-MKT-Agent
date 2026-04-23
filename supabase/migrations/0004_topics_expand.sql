-- ══════════════════════════════════════════════════════════════
-- 0004 · Topics 브리프 필드 확장
--        주제선정(Stage 03) = 1개 확정 + 상세 브리프
--        Copywriter가 이 브리프를 입력으로 본문을 작성한다.
-- ══════════════════════════════════════════════════════════════

alter table topics
  add column if not exists title text,
  add column if not exists slug text,
  add column if not exists primary_keyword text,
  add column if not exists secondary_keywords text[] default '{}',
  add column if not exists target_kpi text check (target_kpi in ('conversion','traffic','dwell_time')),
  add column if not exists persona_id uuid references personas(id) on delete set null,
  add column if not exists outline jsonb default '[]'::jsonb,
  add column if not exists cta_hints jsonb default '[]'::jsonb,
  add column if not exists tone_guide text,
  add column if not exists status text not null default 'draft'
    check (status in ('draft','approved','archived'));

create index if not exists idx_topics_status on topics(status);
create index if not exists idx_topics_idea on topics(idea_id);

-- updated_at trigger
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_topics_updated') then
    execute 'create trigger trg_topics_updated before update on topics
             for each row execute function set_updated_at()';
  end if;
end $$;

alter table topics
  add column if not exists updated_at timestamptz not null default now();

-- drafts 에 topic_id 확정 인덱스
create index if not exists idx_drafts_topic on drafts(topic_id);
