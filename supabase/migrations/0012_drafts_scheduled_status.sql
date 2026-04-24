-- ══════════════════════════════════════════════════════════════
-- 0012 · drafts.status 에 'scheduled' 추가 (발행 예정)
--        콘텐츠 관리 탭에서 발행 세팅 모달로 예약 시 사용
--        metadata.scheduled_at 에 실제 예정 시각 저장
-- ══════════════════════════════════════════════════════════════

alter table drafts
  drop constraint if exists drafts_status_check;

alter table drafts
  add constraint drafts_status_check
    check (status in (
      'drafting',
      'reviewing',
      'approved',   -- 저장됨 (검수 완료, 발행 대기)
      'scheduled',  -- 발행예정 (특정 시각 예약)
      'published',  -- 발행완료
      'rewriting',
      'discarded'
    ));

create index if not exists idx_drafts_scheduled_at
  on drafts ((metadata->>'scheduled_at'))
  where status = 'scheduled';
