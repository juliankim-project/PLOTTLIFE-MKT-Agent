-- ══════════════════════════════════════════════════════════════
-- 0008 · agents model 을 gemini-2.5-flash-lite 로 일괄 변경
--        Free tier RPD 1,000 으로 여유가 가장 큰 모델.
--        gemini-flash-latest (RPD 20) 로 인한 빠른 소진 문제 해결.
-- ══════════════════════════════════════════════════════════════

update agents
   set model = 'gemini-2.5-flash-lite',
       updated_at = now()
 where provider = 'google'
   and is_active = true;
