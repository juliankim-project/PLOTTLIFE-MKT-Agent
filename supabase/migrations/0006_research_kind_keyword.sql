-- ══════════════════════════════════════════════════════════════
-- 0006 · research_sources.kind 에 'keyword' 추가
-- ══════════════════════════════════════════════════════════════

alter table research_sources drop constraint if exists research_sources_kind_check;

alter table research_sources
  add constraint research_sources_kind_check
  check (kind in ('trend','competitor','self','community','reviews','custom','keyword'));
