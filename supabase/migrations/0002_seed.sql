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
