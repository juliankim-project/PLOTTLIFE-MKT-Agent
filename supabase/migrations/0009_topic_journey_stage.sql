-- ══════════════════════════════════════════════════════════════
-- 0009 · topics.journey_stage 필드 추가
--        도입부 시점 매칭(독자가 여정 어느 단계에 있는지)을 위해
--        Copywriter 가 명시적으로 읽어가도록 topic 에 저장.
-- ══════════════════════════════════════════════════════════════

alter table topics
  add column if not exists journey_stage text
    check (journey_stage in (
      'consider','prepare','arrive','settle','live','explore','change'
    ));

-- 기존 데이터: 각 topic 의 idea.cluster 로 채움
update topics t
   set journey_stage = i.cluster
  from ideas i
 where t.idea_id = i.id
   and t.journey_stage is null
   and i.cluster is not null;

create index if not exists idx_topics_journey_stage on topics(journey_stage);
