# Life Marketing Agent — 블로그 자동화 파이프라인

플라트라이프(단기임대 플랫폼) 전용 AI 마케팅 에이전트 팀 + 블로그 자동화 파이프라인.
Next.js 16 · React 19 · Tailwind v4 · Supabase · Anthropic / OpenAI / Google GenAI.

## 구조

```
에이전트 팀 (/)   ─── 8명 에이전트 프로필·관계·상태
블로그 파이프라인 (/blog)
  ├─ 여정 맵 (/blog)
  ├─ 01 리서치    (/blog/research)
  ├─ 02 아이데이션 (/blog/ideation)
  ├─ 03 주제선정   (/blog/topics)
  ├─ 04 작성      (/blog/write)
  ├─ 05 검수      (/blog/review)
  ├─ 06 발행      (/blog/publish)
  └─ 07 성과분석   (/blog/analyze)
```

## 보안 원칙

모든 비밀 키는 **서버 전용**. 브라우저 번들에는 절대 노출되지 않음.

- `NEXT_PUBLIC_*` prefix 가진 값만 클라이언트로 갈 수 있음 → 현재 `NEXT_PUBLIC_APP_URL` 하나뿐
- Supabase / AI API 키는 `NEXT_PUBLIC_` prefix 없이 `.env.local`에만
- 클라이언트 컴포넌트는 Supabase / AI SDK를 **직접 호출하지 않음**. 모든 DB·AI 호출은 `/api/*` route를 거친다
- `src/lib/supabase/server.ts`, `src/lib/ai/*` 는 `import "server-only"` 선언으로 클라이언트 import 차단

## 로컬 셋업

```bash
# 1. 의존성 설치
npm install

# 2. 환경변수
cp .env.example .env.local
# .env.local 에 Supabase / AI 키 채우기

# 3. Supabase 스키마 마이그레이션
# → Supabase Dashboard → SQL Editor 에서
#   supabase/migrations/_bootstrap.sql 내용 복붙 후 Run

# 4. Dev 서버
npx next dev --port 3333

# 5. 헬스체크
curl http://localhost:3333/api/health
# { ok: true, db: { migrated: true, agents: 8 }, ai: { ... } }
```

## 환경변수

| 이름 | 용도 | 공개 여부 |
|---|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL | 서버 전용 |
| `SUPABASE_ANON_KEY` | RLS 적용 공개 키 | 서버 전용 (클라 노출 X) |
| `SUPABASE_SERVICE_ROLE_KEY` | RLS 우회 admin 키 | 서버 전용 (최고 권한) |
| `ANTHROPIC_API_KEY` | Claude | 서버 전용 |
| `OPENAI_API_KEY` | GPT | 서버 전용 |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini | 서버 전용 |
| `NEXT_PUBLIC_APP_URL` | 앱 URL (라우팅용) | 공개 OK |

## DB 스키마

`supabase/migrations/` 참고.

- `projects` · `personas` · `agents` · `research_sources`
- `ideation_runs` · `ideas` · `topics`
- `drafts` · `reviews` · `publications` · `metrics`
- `agent_runs` (모든 에이전트 실행 로그)

모든 테이블 **RLS enable** + 공개 policy 없음 → anon key 유출돼도 데이터 접근 불가.
오직 service_role (서버) 만 접근 가능.

## AI 에이전트 구성

DB `agents` 테이블에 8명 시드. provider/model 은 언제든 SQL 로 바꿀 수 있음.

| 에이전트 | Provider | Model |
|---|---|---|
| SEO Auditor | Anthropic | claude-sonnet-4-5 |
| Content Strategist | Anthropic | claude-sonnet-4-5 |
| Marketing Psychologist | Google | gemini-1.5-pro |
| Copywriter | Anthropic | claude-sonnet-4-5 |
| Social Content Creator | OpenAI | gpt-4o |
| Email Marketer | OpenAI | gpt-4o |
| Performance Marketer | OpenAI | gpt-4o-mini |
| Creative Designer | Google | gemini-1.5-pro |

## API Routes

| Route | 용도 |
|---|---|
| `GET /api/health` | DB·AI 연결 상태 |
| `GET /api/agents` | 등록된 에이전트 목록 |
| `POST /api/agents/run` | 에이전트 실행 (로그 자동 기록) |

`/api/agents/run` 바디:
```json
{
  "agentSlug": "copywriter",
  "stage": "write",
  "projectId": "uuid-optional",
  "prompt": "보증금 0원 단기임대 추천 TOP 10 도입 섹션 작성해줘",
  "context": "optional 추가 컨텍스트",
  "temperature": 0.7,
  "maxTokens": 2000,
  "json": false,
  "providerOverride": "anthropic",
  "modelOverride": "claude-sonnet-4-5"
}
```

## GitHub + Vercel 배포

### 1. GitHub

```bash
git init
git add .
git commit -m "init: blog automation pipeline"
git branch -M main
# 개인 GitHub 에 new repo 만든 후
git remote add origin git@github.com:<you>/life-mkt-agent.git
git push -u origin main
```

`.env.local` 은 **절대 커밋되지 않음** (`.gitignore` 의 `.env*`).

### 2. Vercel

1. https://vercel.com → New Project → GitHub repo 선택
2. Framework: Next.js (자동 감지)
3. **Environment Variables** — 다음 키를 그대로 붙여넣기:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` (보유한 것만)
   - `NEXT_PUBLIC_APP_URL` = 배포 URL (처음엔 `https://<project>.vercel.app`)
4. Deploy

배포 후:
- `https://<domain>/api/health` 로 DB 연결 확인
- 필요 시 `NEXT_PUBLIC_APP_URL` 값을 실제 URL로 업데이트 후 재배포

### 3. CI / 보안 체크리스트

- [ ] `.env.local` 은 `.gitignore` 에 포함 (`.env*` 패턴으로 자동)
- [ ] `NEXT_PUBLIC_` prefix 붙은 변수에 비밀 없음
- [ ] Supabase RLS enable (마이그레이션에 포함)
- [ ] Vercel preview·production 환경변수 모두 셋업

## 다음 단계 (라이브화 로드맵)

- [ ] `/blog/ideation` — 실제 AI 로 토픽 생성 → DB 저장
- [ ] `/blog/topics` — 스코어링 자동 계산 → Final 3 finalized
- [ ] `/blog/write` — 섹션별 스트리밍 작성
- [ ] `/blog/review` — AI 체크리스트 자동 검수
- [ ] `/blog/publish` — 채널별 포맷 변환 + 예약 발행
- [ ] `/blog/analyze` — GA4·Search Console 연동
