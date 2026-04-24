-- ══════════════════════════════════════════════════════════════
-- 0011 · Vertex AI Express Mode 전환 — agents 모델 통일
--        provider 는 "google" 유지 (provider.ts 가 GOOGLE_VERTEX_API_KEY 를 자동 감지)
--        model 은 기본 flash, 런타임에 quality=pro 넘기면 pro 로 override
-- ══════════════════════════════════════════════════════════════

update agents
   set model = 'gemini-2.5-flash'
 where provider = 'google'
   and model in (
     'gemini-flash-latest',
     'gemini-2.5-flash-lite',
     'gemini-2.0-flash',
     'gemini-2.0-flash-lite'
   );

-- 결과 로그용 (실행시 콘솔에 뜸)
do $$
declare r record;
begin
  for r in select slug, display_name, provider, model from agents order by slug loop
    raise notice 'agent %/% → %/%', r.slug, r.display_name, r.provider, r.model;
  end loop;
end $$;
