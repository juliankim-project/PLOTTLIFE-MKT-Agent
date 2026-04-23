-- ══════════════════════════════════════════════════════════════
-- 0003 · Gemini-only mode (무료 티어 활용)
--        Claude/OpenAI 키 없는 상태에서 전부 Gemini 1.5 Pro로.
--        나중에 다른 키 추가되면 0002_seed.sql 재실행으로 원복.
-- ══════════════════════════════════════════════════════════════

update agents
   set provider = 'google',
       model    = 'gemini-1.5-pro',
       updated_at = now()
 where is_active = true;
