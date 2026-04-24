-- ══════════════════════════════════════════════════════════════
-- 0010 · 여정 8단계 확장 (wrapup 마무리 추가)
--        + ideation intent 축을 signal jsonb 안에 저장 (컬럼 추가 없음)
-- ══════════════════════════════════════════════════════════════
-- 여정 흐름: consider → prepare → arrive → settle → live → explore
--         → wrapup (마무리: 귀국 서류·계약해지 or 연장·재계약 결정)
--         → change (변화: 이후 전환·재방문)
-- ══════════════════════════════════════════════════════════════

alter table topics
  drop constraint if exists topics_journey_stage_check;

alter table topics
  add constraint topics_journey_stage_check
    check (journey_stage in (
      'consider','prepare','arrive','settle','live','explore','wrapup','change'
    ));

-- ideas.cluster 는 원래 자유 text 라 별도 제약 없음.
-- signal jsonb 에 {kind, detail, intent} 로 ideation intent 축을 넣는다.
-- (스키마 변경 없이 앱 레이어에서 읽고 씀)

-- 인덱스: intent 별 필터 빠르게
create index if not exists idx_ideas_intent
  on ideas ((signal->>'intent'))
  where signal is not null;
