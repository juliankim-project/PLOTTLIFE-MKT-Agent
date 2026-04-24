# 🤝 PLOTTLIFE-MKT Agent — 세션 인수인계 (2026-04-24)

> 다음 Claude Code 세션 시작 시 먼저 읽어주세요.

---

## 🌐 배포·저장소

| | 링크 |
|---|---|
| 앱 (Production) | https://plottlife-mkt-agent.vercel.app/blog |
| GitHub | https://github.com/juliankim-project/PLOTTLIFE-MKT-Agent |
| Supabase | https://supabase.com/dashboard/project/gycpcnqnnthyhwjnvmzc |
| Vercel | https://vercel.com/juliankim-project/plottlife-mkt-agent |
| 로컬 경로 | `/Users/julian/Desktop/plottlife/life-mkt-agent` |
| 레퍼런스 블로그 | https://dev.life.plott.co.kr/blog/7 (톤·구조 가이드) |
| 도메인 메타 keywords | https://life.plott.co.kr (168개) |

---

## ✅ 완료된 기능 (라이브)

### 01 리서치
- 플라트 메타 168개 → **65개 선별 seed** (카테고리 8개: 지역/대학/타입/기간/옵션/상황/외국인/시즌)
- **네이버 검색광고 API** (keywordstool) 실시간 월검색량·경쟁도 조회 (서버 전용, 조회 전용 wrapper)
- `/blog/research` UI: 카테고리 필터 + 검색 + 정렬(합계/PC/모바일/이름) + 체크박스
- "N개로 아이데이션" → `?keywords=id1,id2,...` 로 다음 탭 전달

### 02 아이데이션
- Gemini로 리서치 키워드 기반 주제 확장 생성
- 점수(fit_score) 내림차순 정렬
- 체크박스 + 선택된 주제 → DB `status='shortlisted'` 로 승격

### 03 주제선정 (브리프)
- shortlisted 중 라디오로 **1개 선택 → Content Strategist가 상세 브리프 생성**
- 아웃라인 H2/H3 + primary/secondary 키워드 + KPI + 페르소나 + CTA 포인트
- **journey_stage 저장** (topic.journey_stage = idea.cluster) — 시점 매칭용

### 04 작성
- Copywriter가 **플라트 스타일 (`/blog/7` 기준) + POV 가이드** 로 본문 작성
- 본문 중 `<!-- IMAGE_SLOT_1,2 -->` 자동 삽입
- Markdown 에디터 split view (좌 수정 / 우 미리보기)
- **저장·다시 작성 버튼**

### 7단계 여정별 독자 시점 (POV) 매칭 ⭐ 오늘 완성
- `src/lib/blog-style.ts` `JOURNEY_STAGE_POV` 에 Consider/Prepare/Arrive/Settle/Live/Explore/Change 각 단계:
  - `readerState` — 독자 현재 상황
  - `hookExamples` — 도입부 권장 훅 3개
  - `banPhrases` — 단계 어긋나는 표현 금지
- Writer 프롬프트에 단계 라벨 + POV 블록 자동 주입
- **검증**: Consider 단계 주제로 테스트 시 "한국 유학, 막상 가볼까 생각하면…" 이런 훅 정확 활용, "즐겁게 보내고 계신가요?" 같은 표현 0회

### Writer 프롬프트 강화 (어제 완료)
- 체크리스트 10개 (`~예요` 고정, "여러분" 최대 2회, 브랜드명 한글만 등)
- 금지어 리스트 (거든요/답니다/Flatlife)
- few-shot 예시 (`/blog/7` 발췌)
- Temperature 0.7 → 0.5 (일관성)

---

## ⏳ 진행 중 / 대기 중

### 이미지 생성 (🖼 이미지 생성 버튼)
- **코드·UI 완성** (Creative Designer → Gemini Image → Supabase Storage → Markdown 치환)
- **현재 막힌 이유**: Gemini Free Tier 가 **이미지 API는 사실상 0 requests/day**
  - Imagen 4 = Paid only (확인됨)
  - Gemini 2.5 Flash Image = 429 quota 계속 초과
- **해결 옵션** (사용자 결정 대기):
  - 🅐 Google Cloud 결제 활성화 (월 ~$1.8 · Imagen 4 Fast) — **추천**
  - 🅑 OpenAI DALL-E 3 ($3.6/월)
  - 🅒 Unsplash 무료 스톡 사진
  - 🅓 Replicate Flux Schnell (~$1/월)
- fallback 체인 활성 모델: `gemini-2.5-flash-image` → `gemini-3.1-flash-image-preview` → `nano-banana-pro-preview`

### Google Ads API (영어 키워드)
- **신청서 제출 완료** (2026-04-23). 승인 대기 중 (1~3영업일)
- 승인 받으면 → 영어 키워드 실제 월검색량 + 국가별 분포 (Naver 한글과 병렬)
- 저장 경로: `docs/google-ads-api-design.pdf`
- 승인 이메일 오면 `ANTHROPIC_API_KEY` 처럼 env 추가 + 코드 `src/lib/research/google-ads.ts` 작성

---

## 📋 DB 스키마 (현재)

### Core
- `projects` · `personas` · `agents` (8명, 전부 google/gemini-2.5-flash 또는 gemini-flash-latest)
- `research_sources` (kind='keyword', 65개 seed + language 컬럼)
- `ideation_runs` · `ideas` (cluster 여정 단계 포함)
- `topics` (journey_stage · outline · cta_hints · brief 등)
- `drafts` (body_markdown · hero_image_url 등)
- `agent_runs` (전 호출 로그)

### Migration 히스토리
```
0001_init.sql              코어 12 테이블 + RLS
0002_seed.sql              8 에이전트 + 5 페르소나 + 기본 프로젝트
0003_agents_gemini_only.sql  Gemini 통일
0004_topics_expand.sql     브리프 필드 (outline, kpi, persona, etc)
0005_research_keywords.sql category + 검색량 컬럼
0006_research_kind_keyword.sql kind='keyword' 허용
0007_storage_blog_images.sql blog-images 버킷 (public read)
0009_topic_journey_stage.sql topics.journey_stage 추가 + backfill
```

> 마이그레이션 실행: `node scripts/db-migrate.mjs supabase/migrations/NNNN_xxx.sql`

---

## 🔑 환경변수 (`.env.local` 만, git 제외)

```
SUPABASE_URL=https://gycpcnqnnthyhwjnvmzc.supabase.co
SUPABASE_ANON_KEY=eyJ…
SUPABASE_SERVICE_ROLE_KEY=eyJ…
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy…
NAVER_AD_CUSTOMER_ID=1062453
NAVER_AD_API_KEY=010000…
NAVER_AD_SECRET_KEY=AQAAA…
PGHOST=aws-1-ap-northeast-2.pooler.supabase.com
PGPORT=5432
PGUSER=postgres.gycpcnqnnthyhwjnvmzc
PGPASSWORD=Epaldks123!@   (⚠ 민감 · 보안상 추후 reset 권장)
PGDATABASE=postgres
NEXT_PUBLIC_APP_URL=https://plottlife-mkt-agent.vercel.app
```

**Vercel Production/Preview** 에도 동일 등록 필요 (PG* 제외, 그건 로컬 마이그레이션 전용).

---

## 🎯 다음 세션에서 할 만한 것 (우선순위)

### 1. 이미지 생성 해결 (사용자 결정 후)
Google Cloud 결제 또는 Unsplash 붙이기.

### 2. 검수(Review) 단계 라이브화
SEO Auditor + Marketing Psychologist 실제 AI 체크리스트 검증. 
`/blog/review` mock → live 전환.

### 3. 발행(Publish) 채널 변환
Social Content Creator 가 본문 → 인스타 카드 5컷 / X 스레드 / 뉴스레터 요약 변환.
`/blog/publish` mock → live.

### 4. 성과 분석 → 리서치 피드백 순환
Performance Marketer 가 발행 후 성과 데이터 분석 → 리서치 키워드에 피드백.

### 5. Anthropic Claude 도입 (선택)
Copywriter + Content Strategist 만 Claude Sonnet 4.5로 전환하면 품질 더 올라감 (월 $2~5).
코드는 이미 `src/lib/ai/provider.ts` 에 Anthropic 지원 있음. env 추가 + DB update 만.

### 6. 영어 키워드 (Google Ads 승인 후)
`src/lib/research/google-ads.ts` 새로 작성. 리서치 탭에 🇰🇷/🇺🇸 토글.

---

## 🐛 최근 수정된 버그

- `/api/drafts/[id]/images` persona_id 컬럼 불일치 (drafts에 없는 컬럼 select) → 404 "draft not found" 뱉음 → 수정 완료
- `/api/topics` list 응답에 journey_stage 컬럼 누락 → 추가 완료
- `blog-style.ts` 여정별 POV 가이드 없었음 → 7단계 전부 추가

---

## 📁 중요 파일 맵

```
src/
├── app/
│   ├── blog/
│   │   ├── _lib/blog.css       블로그 셸 디자인 토큰 (Indigo-Violet)
│   │   ├── _lib/stages.ts      STAGES 상수 (카드 내용)
│   │   ├── _ui/                Icon, PageHeader, MiniKPI 공통 UI
│   │   ├── page.tsx            Journey Map (블로그 홈)
│   │   ├── research/page.tsx   01 리서치
│   │   ├── ideation/page.tsx   02 아이데이션
│   │   ├── topics/page.tsx     03 주제선정 + 브리프
│   │   ├── write/[id]/page.tsx 04 작성 에디터
│   │   ├── review/page.tsx     05 (mock)
│   │   ├── publish/page.tsx    06 (mock)
│   │   └── analyze/page.tsx    07 (mock)
│   └── api/
│       ├── agents/ · ideation/ · topics/ · drafts/ · research/
├── lib/
│   ├── ai/
│   │   ├── provider.ts         Anthropic/OpenAI/Google 통합
│   │   ├── agents.ts           runAgent + agent_runs 로그
│   │   ├── ideation.ts         30개 주제 생성
│   │   ├── brief.ts            Content Strategist 브리프 생성
│   │   ├── writer.ts           Copywriter 본문 작성
│   │   ├── image-gen.ts        Gemini Image wrapper
│   │   └── image-prompt.ts     Creative Designer 프롬프트 빌더
│   ├── images/upload.ts        Supabase Storage 업로드
│   ├── research/naver-ads.ts   네이버 검색광고 API (조회 전용)
│   ├── research/seed-keywords.ts 65개 선별 키워드
│   ├── supabase/server.ts      server-only Supabase client
│   └── blog-style.ts           ⭐ 스타일 가이드 + JOURNEY_STAGE_POV
```

---

## 🧠 핵심 설계 철학

1. **서버 전용 비밀 키** — 클라이언트 번들에 절대 노출 X (모든 AI·DB 호출은 `/api/*` 경유)
2. **1 콘텐츠 per 라운드** 파이프라인 — 발산(아이데이션) → 수렴(주제선정 1개) → 본문 1편 → 검수 → 발행
3. **여정 7단계** 중심 — 아이디어·브리프·작성·CTA 모두 이 축으로 정렬
4. **Gemini 기본 + 추후 모델 믹스** — 에이전트별 `provider/model` DB 필드로 하위 호환
5. **Supabase 단일 데이터 원천** — 아이디어부터 발행 이력까지 한 DB

---

## 💬 다음 세션 시작할 때 이렇게

**첫 메시지 템플릿**:

```
HANDOFF.md 읽고 이어서 진행하자.

오늘 할 것:
- (원하는 것: 예) 이미지 생성 Unsplash 로 연결
- (또는) 검수 단계 라이브화
```

또는 더 짧게: **"HANDOFF.md 확인하고 [할 일] 해줘"**

— 2026-04-24 인계 끝
