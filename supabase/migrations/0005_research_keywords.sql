-- ══════════════════════════════════════════════════════════════
-- 0005 · Research 키워드 라이브러리
--        research_sources 에 kind='keyword' 로 저장하고,
--        편의를 위해 별도 뷰·확장 컬럼 제공.
-- ══════════════════════════════════════════════════════════════

alter table research_sources
  add column if not exists category text,                  -- 키워드 카테고리
  add column if not exists monthly_pc integer,             -- PC 월 검색량
  add column if not exists monthly_mobile integer,         -- 모바일 월 검색량
  add column if not exists monthly_total integer,          -- 합계
  add column if not exists competition text,               -- low / medium / high / unknown
  add column if not exists enriched_at timestamptz;        -- 네이버 API 마지막 조회 시각

create unique index if not exists uq_research_keyword
  on research_sources(project_id, kind, label);

create index if not exists idx_research_category
  on research_sources(category)
  where kind = 'keyword';

create index if not exists idx_research_monthly_total
  on research_sources(monthly_total desc nulls last)
  where kind = 'keyword';
