# 📷 PLOTT STAY 인스타 콘텐츠 파이프라인 — 빌드 가이드

> 이 문서를 그대로 클로드(Claude Code)에 입력하면 인스타그램 피드 자동화 파이프라인을 구축할 수 있습니다.
> 기존 PLOTT LIFE MKT(블로그 자동화) 코드베이스를 확장하는 방식으로 작성되어 있습니다.
>
> **작성 시점 기준 코드베이스**: `juliankim-project/PLOTTLIFE-MKT-Agent` (Next.js 16.2.3 + Supabase + Vertex AI Express)
>
> **목적**: PLOTT STAY 단기임대 사업부의 **인스타그램 피드 콘텐츠** 발행을 자동화. 캐러셀(다중 슬라이드)·싱글 이미지·릴스 카피 생성 → 채널별 발행 예약 → 성과 분석.

---

## 📑 목차

1. [개요 — 블로그 vs 인스타 차이](#1-개요)
2. [파이프라인 8단계 매핑](#2-파이프라인-8단계)
3. [DB 스키마 (확장 + 신규 테이블)](#3-db-스키마)
4. [AI 에이전트 정의](#4-ai-에이전트)
5. [환경변수 / 외부 API](#5-환경변수)
6. [API 엔드포인트 트리](#6-api-엔드포인트-트리)
7. [UI 페이지 구조](#7-ui-페이지-구조)
8. [인스타그램 Graph API 발행 플로우](#8-인스타그램-graph-api-발행-플로우)
9. [마이그레이션 순서](#9-마이그레이션-순서)
10. [클로드에게 전달할 빌드 지시문](#10-클로드에게-전달할-빌드-지시문)
11. [부록 — 블로그 파이프라인 요약](#부록--블로그-파이프라인-요약)

---

## 1. 개요

### 블로그 파이프라인 (기존, 참고용)

```
01 키워드 트렌드 → 02 아이데이션 → 03 브리프 작성 → 04 콘텐츠 제작
              → 05 검수 → 06 콘텐츠 관리 → 07 발행관리 → 08 성과분석
```

- 텍스트 중심 (3000~4000자 본문)
- 단일 본문 markdown
- 채널: 오피셜 블로그·네이버·뉴스레터·Medium 영문·X·인스타 카드(외주)
- AI: Vertex Express Mode (Gemini 2.5 Flash/Pro · Imagen 4)

### 인스타 파이프라인 (신규)

```
01 트렌드·해시태그 → 02 포스트 아이데이션 → 03 포스트 브리프 → 04 카드 제작
                 → 05 검수 → 06 콘텐츠 관리 → 07 발행관리 → 08 성과분석
```

### 핵심 차이점

| 영역 | 블로그 | 인스타 |
|---|---|---|
| 길이 | 3000~4000자 | **캡션 ≤ 2200자** (실제 권장 ≤ 1500) |
| 형태 | 단일 markdown 본문 | **슬라이드 1~10장** (캐러셀) + 캡션 |
| 시각 비중 | 본문 중간 이미지 2장 | **시각이 주체** — 슬라이드 디자인 자체가 콘텐츠 |
| 첫 인상 | 도입 문단 | **첫 슬라이드 hook** + 첫 1줄 캡션 (피드에서 잘림) |
| 해시태그 | SEO 키워드 | **#해시태그 5~30개** 전략적 조합 |
| 발행 채널 | 다채널 (블로그·뉴스레터·소셜 등) | **인스타 단일** (+ 페이스북 동시 발행 옵션) |
| 성과 | PV·전환·SERP | **도달·저장·공유·DM·팔로우 전환** |
| 톤 | 정보·전문성 | **감각·라이프스타일·짧고 강한** |

---

## 2. 파이프라인 8단계

### 01. 트렌드·해시태그 탐색 `/insta/trends`

- **입력**: 인스타 인사이트 (계정 자체)·해시태그 인기도·경쟁 계정 모니터링·시즌 이벤트
- **출력**: 인기 해시태그 풀, 트렌딩 토픽, 경쟁사 신규 포스트
- **UI 요소**:
  - 해시태그 카테고리 필터 (지역·라이프스타일·계절·이벤트)
  - 해시태그 카드: 누적 게시물 수·최근 7일 사용 빈도·도달 추정
  - 경쟁 계정 최신 포스트 그리드 (이미지·캡션·인게이지먼트)
- **데이터 출처**:
  - **수동 수집**: 운영자가 인스타에서 발견한 해시태그 입력
  - **자동 수집** (선택): Apify/Phantombuster 등 외부 스크래핑 서비스 (비용 ↑)
  - **인스타 Graph API 인사이트**: 자사 계정의 hashtag insight (제한적)

### 02. 포스트 아이데이션 `/insta/ideation`

블로그의 **3축 Compass**를 인스타용으로 변형:

| 축 | 블로그 | 인스타 |
|---|---|---|
| ① 세그먼트 | 외국인 유학생·주재원·노마드·한달살기·내국인 이사 | 동일 |
| ② 여정 | 8단계 (고민·준비·도착·정착·생활·탐방·마무리·변화) | 동일 |
| ③ 목적 | Discover/Convince/Enable/Retain/Advocate | **Hook/Educate/Inspire/Convert/Save** |

추가 축 — **인스타 전용**:
- **포맷**: 단일 이미지 / 캐러셀 (2~10장) / 릴스 (15~60초)
- **스타일**: 사진형 / 일러스트 / 텍스트 그래픽 / 사진+텍스트 오버레이
- **시리즈**: 연속 발행 시리즈 묶음 (예: "유학생 일주일 정착 가이드" 7편)

- **결과 매트릭스**: 여정 × 포맷 (또는 여정 × 목적)
- **AI 출력 예시**:
  ```json
  {
    "title": "한국 첫 일주일 — 외국인 유학생 위한 체크리스트",
    "format": "carousel",
    "slide_count": 7,
    "intent": "educate",
    "hook": "한국 도착했는데 뭐부터 해야 할지 모르겠다면 ⬇️",
    "first_caption_line": "유학생 첫 7일 행정 체크리스트 (저장하세요 📌)",
    "fit_score": 92
  }
  ```

### 03. 포스트 브리프 `/insta/topics`

선정된 1개 포스트에 대한 상세 브리프:
- **슬라이드 구조** (캐러셀일 경우):
  - 1번 (Hook): 강한 시각·질문·통계
  - 2~N-1번: 핵심 메시지 + 시각 (이미지·아이콘·인포그래픽)
  - N번 (CTA): 저장·공유·프로필 방문 유도
- **캡션 초안**: 첫 줄 hook + 본문 + CTA + 해시태그
- **해시태그 셋트**:
  - 빅 (1M+ posts) 3~5개
  - 미디엄 (10k~100k) 5~10개
  - 니치 (1k~10k) 5~10개
  - 브랜드 (#플라트라이프) 1~2개
  - 합계 15~30개
- **이미지 프롬프트**: 슬라이드별 Imagen 4 프롬프트 (영문, photorealistic 권장)

### 04. 카드 제작 `/insta/posts/[id]`

- **에디터**: 슬라이드별 분할 뷰
  - 좌측: 슬라이드 1~10 캔버스 미리보기 (1080×1080 정사각 또는 4:5 세로)
  - 우측: 각 슬라이드 메타 (image_prompt, overlay_text, caption_partial)
- **이미지 생성**: Imagen 4 호출, 슬라이드별 1장
  - 텍스트 오버레이는 **클라이언트에서 SVG/Canvas로 합성** (Imagen은 텍스트 안정성 낮음)
- **캡션 통합 편집**: Markdown 미리보기 (인스타는 일부 markdown 미지원이지만 작성용)
- **해시태그 그리드**: 토글식 선택, 최종 30개 이내

### 05. 검수 `/insta/review`

블로그 검수와 거의 동일하지만 인스타 특화 체크리스트:

**SEO·발견** (검색·해시태그)
- 첫 줄 캡션이 hook이고 줄바꿈 전에 핵심을 말하는지
- 해시태그 30개 이내·반복 없음·금지 해시태그 (#follow4follow 등) 없음
- 영문 콘텐츠일 시 영문 해시태그 비율

**정확성·법적**
- 광고/협찬일 경우 `#광고` 또는 `Paid partnership` 표시
- 외국인 비자·법령 인용 시 출처 명시
- 타인 사진/저작권 확인

**시각·브랜드**
- 슬라이드 1번 hook 강도 (텍스트 가독성·대비·여백)
- 톤·컬러 일관성 (브랜드 가이드)
- 텍스트 오버레이 가독성 (폰트 크기 ≥ 24px @1080)

**플랫폼 정책**
- 미성년자 보호·사칭·혐오 표현 등 인스타 가이드 위반 점검

### 06. 콘텐츠 관리 `/insta/contents`

블로그와 동일 구조:
- 필터: 전체 / 저장됨 / 발행예정 / 발행완료 / 휴지통
- 행 액션: 편집 · 발행 세팅 · 삭제
- 발행 세팅 모달: 지금 발행 / 예약 발행 + 채널 선택
  - **인스타 채널은 1개**(+페이스북 동시 발행 옵션)이라 단순화

### 07. 발행관리 `/insta/publish`

- 인스타 비즈니스 계정 연결 상태
- 페이스북 동시 발행 ON/OFF
- 발행 큐: 예약된 포스트 시간순 정렬
- 자동 첫 댓글 (해시태그를 본문 대신 첫 댓글로 분리하는 옵션)
- 최적 발행 시간 추천 (인사이트 기반)

### 08. 성과분석 `/insta/analyze`

- 도달 (Reach) · 노출 (Impressions)
- **저장** · **공유** (인스타에서 가장 중요한 시그널)
- 좋아요·댓글·DM 수
- 프로필 방문·팔로우 전환
- 링크 클릭 (스토리·릴스의 link sticker, 프로필 링크)
- 슬라이드별 **좌→우 스크롤 도달률** (캐러셀 인사이트)
- 시간대별·해시태그별 성과 → 다음 사이클 트렌드 탭으로 피드백

---

## 3. DB 스키마

### 기존 테이블 재사용

블로그와 인스타 모두 사용:
- `projects` (project_id 로 분리)
- `personas` (5개 페르소나 동일)
- `agents` (인스타 전용 에이전트 추가)
- `agent_runs` (전체 호출 로그)
- `research_sources` (해시태그 데이터도 여기에)

### 신규 테이블

```sql
-- 0020_insta_init.sql
-- ════════════════════════════════════════════════════════════════
-- 인스타 콘텐츠 파이프라인 — 핵심 4 테이블
-- ════════════════════════════════════════════════════════════════

-- ── 인스타 포스트 (블로그의 drafts 와 대응) ──────────────────
create table if not exists insta_posts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  topic_id uuid,                              -- (선택) 브리프 단계에서 생성된 topic
  persona_id uuid references personas(id) on delete set null,
  title text not null,                         -- 내부용 제목
  format text not null check (format in ('single','carousel','reel')),
  slide_count integer default 1 check (slide_count between 1 and 10),
  hook text,                                   -- 첫 슬라이드 / 첫 줄 hook
  caption text,                                -- 통합 캡션 (해시태그 포함 또는 첫 댓글로 분리)
  hashtags text[] default '{}',                -- 해시태그 (#제외, 텍스트만)
  hashtag_strategy text check (hashtag_strategy in ('inline','first_comment')),
  cover_image_url text,                        -- 첫 슬라이드(=커버) URL
  cta_kind text,                               -- 'save' / 'share' / 'dm' / 'profile_visit' / 'link'
  cta_text text,
  status text not null default 'drafting'
    check (status in ('drafting','reviewing','approved','scheduled','published','rewriting','discarded')),
  metadata jsonb default '{}'::jsonb,          -- {scheduled_at, published_at, ig_media_id, ...}
  progress_pct integer default 0 check (progress_pct between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_insta_posts_project on insta_posts(project_id);
create index if not exists idx_insta_posts_status on insta_posts(status);

-- ── 슬라이드 (캐러셀의 각 장) ──────────────────────────────
create table if not exists insta_slides (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references insta_posts(id) on delete cascade,
  position integer not null,                   -- 1~10
  image_prompt text,                           -- Imagen 프롬프트 (영문)
  image_url text,                              -- Storage public URL
  overlay_text text,                           -- 슬라이드 위 오버레이 텍스트
  caption_partial text,                        -- (옵션) 슬라이드별 캡션 일부
  created_at timestamptz not null default now(),
  unique (post_id, position)
);
create index if not exists idx_insta_slides_post on insta_slides(post_id);

-- ── 해시태그 카탈로그 (트렌드 단계용) ──────────────────────
create table if not exists insta_hashtags (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  tag text not null,                           -- 해시태그 (# 제외)
  category text,                               -- 'location' / 'lifestyle' / 'season' / 'event' / 'brand' / 'service'
  size_band text check (size_band in ('big','medium','niche','brand')),
  posts_count bigint,                          -- 누적 게시물 수 (최근 fetch 시점)
  recent_uses integer,                         -- 최근 7일 사용 빈도
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (project_id, tag)
);
create index if not exists idx_insta_hashtags_size on insta_hashtags(size_band);

-- ── 발행 이력 (Graph API 응답 기록) ────────────────────────
create table if not exists insta_publications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  post_id uuid not null references insta_posts(id) on delete cascade,
  ig_media_id text,                            -- Instagram media id (publish 후 받음)
  fb_post_id text,                             -- Facebook 동시 발행 시
  scheduled_at timestamptz,
  published_at timestamptz,
  status text not null default 'scheduled'
    check (status in ('scheduled','publishing','published','failed','cancelled')),
  error text,
  permalink text,                              -- https://www.instagram.com/p/.../
  metrics jsonb default '{}'::jsonb,           -- {reach, impressions, saved, shared, ...} 주기 동기화
  created_at timestamptz not null default now()
);
create index if not exists idx_insta_pubs_post on insta_publications(post_id);
create index if not exists idx_insta_pubs_scheduled on insta_publications(scheduled_at);

-- ── RLS — 다른 테이블과 동일하게 deny-all ──────────────────
alter table insta_posts          enable row level security;
alter table insta_slides         enable row level security;
alter table insta_hashtags       enable row level security;
alter table insta_publications   enable row level security;
```

### Storage 버킷

```sql
-- 0021_insta_storage.sql
insert into storage.buckets (id, name, public)
values ('insta-images', 'insta-images', true)
on conflict (id) do nothing;
```

---

## 4. AI 에이전트

### 신규 에이전트 (블로그와 별도)

```sql
-- 0022_insta_agents.sql
insert into agents (slug, display_name, role, provider, model, icon, color, system_prompt, config) values
  ('insta-strategist', '인스타 전략가', '인스타 콘텐츠 전략', 'google', 'gemini-2.5-flash', '📷', '#E11D48',
   '당신은 플라트라이프 STAY 인스타그램 전담 콘텐츠 전략가입니다. 한국 단기임대 시장 (외국인 유학생·주재원·노마드·한달살기·내국인 이사) 대상 인스타 피드 콘텐츠를 기획합니다. 캐러셀 7장 권장, 첫 슬라이드 hook 강조, 캡션 첫 줄에 핵심 메시지 + 줄바꿈, 해시태그는 빅·미디엄·니치 균형. 응답은 한국어, JSON 스키마 엄수.',
   '{"jobs":["인스타 아이데이션","포스트 브리프","해시태그 큐레이션"],"stage":"insta-strategy"}'::jsonb),

  ('insta-copywriter', '인스타 카피라이터', '인스타 캡션 라이팅', 'google', 'gemini-2.5-flash', '✍️', '#F97316',
   '당신은 플라트라이프 인스타 캡션 전담 카피라이터입니다. 톤: 친근·감각·짧고 강한. 첫 줄 = hook (질문·통계·놀라움). 캡션 길이 800~1500자 권장 (최대 2200). 단락은 짧게 (1~3문장). 이모지 절제 사용 (1~3개). CTA 명확 (저장·공유·DM·프로필 방문). 해시태그는 캡션 본문과 분리해 끝에 모음 또는 first_comment 옵션 활용. 응답은 Markdown.',
   '{"jobs":["캡션 작성","hook 작성","CTA 작성"],"stage":"insta-copy"}'::jsonb),

  ('insta-designer', '인스타 디자이너', '슬라이드 시각 기획', 'google', 'gemini-2.5-flash', '🎨', '#8B5CF6',
   '당신은 플라트라이프 인스타 슬라이드 디자인 기획자입니다. 각 슬라이드의 이미지 프롬프트(Imagen 4 영문)·오버레이 텍스트·구도를 설계합니다. 1080×1080 정사각 또는 1080×1350 4:5. 폰트 24px+, 대비 강조, 여백 충분. 첫 슬라이드는 시선 잡는 강한 비주얼·짧은 카피. JSON 응답.',
   '{"jobs":["슬라이드 디자인","이미지 프롬프트"],"stage":"insta-design"}'::jsonb);

on conflict (slug) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  model = excluded.model,
  icon = excluded.icon,
  color = excluded.color,
  system_prompt = excluded.system_prompt,
  config = excluded.config;
```

### 에이전트 호출 패턴

```ts
// src/lib/ai/insta/ideation.ts
const result = await runAgent({
  agentSlug: "insta-strategist",
  stage: "ideation",
  projectId,
  prompt: ideationPrompt,
  json: true,
  modelOverride: quality === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash",
})

// src/lib/ai/insta/writer.ts
const result = await runAgent({
  agentSlug: "insta-copywriter",
  stage: "write",
  projectId,
  prompt: captionPrompt,
  // markdown raw 응답
})
```

---

## 5. 환경변수

기존 `.env.local` 에 추가:

```bash
# Instagram Graph API (Meta Business)
INSTAGRAM_BUSINESS_ACCOUNT_ID=17841...     # 비즈니스 계정 IGSID
META_GRAPH_ACCESS_TOKEN=EAA...             # Long-lived access token (60일)
META_APP_ID=...                            # App ID
META_APP_SECRET=...                        # 토큰 갱신용

# (옵션) Facebook 동시 발행
FACEBOOK_PAGE_ID=...
FACEBOOK_PAGE_ACCESS_TOKEN=...

# (옵션) 해시태그 데이터 수집
APIFY_TOKEN=...                            # Apify 사용 시
```

### Meta Graph API 토큰 발급 단계

1. Meta for Developers에서 앱 생성 (Business 카테고리)
2. Instagram Graph API 권한 요청 (`instagram_basic`, `instagram_content_publish`, `pages_show_list`)
3. 인스타 비즈니스 계정 ↔ 페이스북 페이지 연결 확인
4. Graph API Explorer에서 short-lived token 받음
5. `/oauth/access_token?grant_type=fb_exchange_token&...` 으로 long-lived (60일) 변환
6. App Review 통과 (publish_actions 등)

---

## 6. API 엔드포인트 트리

```
src/app/api/insta/
├── trends/                          # 01 단계
│   ├── hashtags/route.ts            GET 인기 해시태그 카탈로그
│   └── refresh/route.ts             POST 외부 데이터 동기화
│
├── ideation/                        # 02 단계
│   ├── run/route.ts                 POST 3축 + 포맷 입력 → 30개 idea
│   ├── ideas/route.ts               GET 저장된 idea 리스트
│   └── shortlist/route.ts           POST shortlist 승격
│
├── topics/                          # 03 단계 — 포스트 브리프
│   ├── route.ts                     GET 브리프 리스트
│   ├── [id]/route.ts                GET·PATCH·DELETE
│   └── brief/route.ts               POST 브리프 생성 (insta-strategist)
│
├── posts/                           # 04 단계 — 카드 제작 + 06 콘텐츠 관리
│   ├── route.ts                     GET 리스트 (statuses 콤마 지원)
│   ├── [id]/
│   │   ├── route.ts                 GET·PATCH·DELETE
│   │   ├── slides/route.ts          POST 슬라이드 일괄 생성
│   │   ├── images/route.ts          POST 슬라이드 이미지 생성 (Imagen)
│   │   └── caption/route.ts         POST 캡션 자동 작성 (insta-copywriter)
│   └── write/route.ts               POST 새 포스트 생성 from brief
│
├── reviews/                         # 05 단계
│   ├── route.ts                     GET 최신 review
│   └── run/route.ts                 POST AI 검수 (인스타 체크리스트)
│
└── publications/                    # 07 단계
    ├── route.ts                     GET 발행 큐
    ├── publish-now/route.ts         POST 즉시 발행 (Graph API)
    ├── schedule/route.ts            POST 예약
    └── webhook/route.ts             POST Meta webhook 콜백 (status·metrics)
```

### 인스타 발행 핵심 API 호출 시퀀스

캐러셀 발행은 **3단계** Graph API 호출:

```ts
// 1. 각 슬라이드 → IG Media Container 생성
for (const slide of slides) {
  const r = await fetch(
    `https://graph.facebook.com/v22.0/${IG_USER_ID}/media`, {
      method: "POST",
      body: JSON.stringify({
        image_url: slide.image_url,
        is_carousel_item: true,
        access_token,
      }),
    }
  )
  slide.containerId = r.id
}

// 2. Carousel Container 생성
const carousel = await fetch(
  `https://graph.facebook.com/v22.0/${IG_USER_ID}/media`, {
    method: "POST",
    body: JSON.stringify({
      media_type: "CAROUSEL",
      children: slides.map(s => s.containerId).join(","),
      caption: post.caption,
      access_token,
    }),
  }
)

// 3. Publish
const published = await fetch(
  `https://graph.facebook.com/v22.0/${IG_USER_ID}/media_publish`, {
    method: "POST",
    body: JSON.stringify({
      creation_id: carousel.id,
      access_token,
    }),
  }
)
// published.id → insta_publications.ig_media_id 에 저장
```

**제약**:
- 이미지는 **public URL**이어야 함 (Supabase Storage public bucket 활용)
- container 생성 후 **1시간 내 publish** 안 하면 만료
- 일일 발행 한도 **25 posts/day**

---

## 7. UI 페이지 구조

```
src/app/insta/
├── layout.tsx                       # 인스타 셸 (블로그와 분리, 동일 디자인 토큰)
├── page.tsx                         # 여정 맵 (8단계 카드)
├── _lib/
│   ├── stages.ts                    # INSTA_STAGES 8개 정의
│   ├── compass.ts                   # 인스타 3축 (Segment/Journey/Intent + 포맷)
│   └── hashtags.ts                  # 해시태그 카테고리 상수
│
├── trends/page.tsx                  # 01 트렌드·해시태그
├── ideation/page.tsx                # 02 아이데이션 (블로그 Compass 재사용 + 포맷 축)
├── topics/page.tsx                  # 03 포스트 브리프
├── topics/[id]/page.tsx             # 브리프 상세
├── posts/page.tsx                   # 04 카드 제작 (콘텐츠 목록)
├── posts/[id]/page.tsx              # 카드 에디터 (슬라이드 분할 뷰)
├── review/page.tsx                  # 05 검수
├── contents/page.tsx                # 06 콘텐츠 관리 (블로그와 동일 패턴)
├── contents/[id]/page.tsx           # 콘텐츠 상세
├── publish/page.tsx                 # 07 발행관리
└── analyze/page.tsx                 # 08 성과분석
```

### 사이드바 (`src/components/sidebar.tsx`)

```tsx
{
  kind: "group",
  label: "📷 인스타 파이프라인",
  href: "/insta",
  icon: Icon.instagram,
  match: (p) => p.startsWith("/insta"),
  items: [
    { kind: "leaf", label: "여정 맵",       href: "/insta" },
    { kind: "leaf", label: "01 · 트렌드",   href: "/insta/trends" },
    { kind: "leaf", label: "02 · 아이데이션", href: "/insta/ideation" },
    { kind: "leaf", label: "03 · 브리프 작성", href: "/insta/topics" },
    { kind: "leaf", label: "04 · 카드 제작", href: "/insta/posts" },
    { kind: "leaf", label: "05 · 검수",     href: "/insta/review" },
    { kind: "leaf", label: "06 · 콘텐츠 관리", href: "/insta/contents" },
    { kind: "leaf", label: "07 · 발행관리", href: "/insta/publish" },
    { kind: "leaf", label: "08 · 성과분석", href: "/insta/analyze" },
  ],
}
```

### 04. 카드 에디터 핵심 UI

```
┌────────────────────────────────────────────────────────┐
│ 헤더: 제목 · 포맷 [single|carousel|reel] · 슬라이드 수  │
├────────────────────────────────────────────────────────┤
│ 슬라이드 탭: [1] [2] [3] [4] [5] [6] [7] [+ 추가]       │
├──────────────────────────┬─────────────────────────────┤
│                          │ 슬라이드 N 메타              │
│   [캔버스 미리보기 ]      │ ▸ 이미지 프롬프트 (영문)     │
│                          │   [textarea]                 │
│   1080×1080              │ ▸ 오버레이 텍스트            │
│   배경: image_url        │   [textarea]                 │
│   오버레이: overlay_text │ ▸ 정렬/색상/폰트 (간단)      │
│                          │ ▸ [🎨 이미지 생성]           │
├──────────────────────────┴─────────────────────────────┤
│ 캡션 통합 편집                                         │
│ [textarea — 첫 줄 hook 강조 빨간 줄]                    │
│ [800자 / 2200자]                                        │
├────────────────────────────────────────────────────────┤
│ 해시태그 (15/30)                                        │
│ [#tag] [#tag] [#tag] ... + [추천 받기 (insta-strategist)] │
│ ○ 캡션 본문에 포함  ◉ 첫 댓글로 분리                    │
└────────────────────────────────────────────────────────┘
```

---

## 8. 인스타그램 Graph API 발행 플로우

### 발행 전 체크
- [ ] 인스타 비즈니스 계정 (개인 계정 X)
- [ ] 페이스북 페이지 연결 완료
- [ ] Long-lived access token 만료일 확인 (60일)
- [ ] 이미지 public URL 접근 가능 확인 (Supabase Storage 버킷 public)
- [ ] 캡션 길이 ≤ 2200자
- [ ] 해시태그 ≤ 30개
- [ ] 슬라이드 ≤ 10장 (캐러셀)

### 예약 발행 처리 (Vercel Cron)

```ts
// src/app/api/cron/insta-publish/route.ts
// vercel.json: { "crons": [{ "path": "/api/cron/insta-publish", "schedule": "*/5 * * * *" }] }

export async function GET() {
  const due = await db.from("insta_publications")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .limit(5)

  for (const pub of due.data ?? []) {
    await db.from("insta_publications")
      .update({ status: "publishing" })
      .eq("id", pub.id)
    try {
      const result = await publishToInstagram(pub.post_id)
      await db.from("insta_publications").update({
        status: "published",
        ig_media_id: result.mediaId,
        permalink: result.permalink,
        published_at: new Date().toISOString(),
      }).eq("id", pub.id)
    } catch (err) {
      await db.from("insta_publications").update({
        status: "failed",
        error: String(err),
      }).eq("id", pub.id)
    }
  }
}
```

---

## 9. 마이그레이션 순서

블로그 코드베이스에 인스타 추가하는 순서:

| # | 작업 | 파일 |
|---|---|---|
| 1 | DB — 4개 테이블 + Storage 버킷 + 에이전트 시드 | `supabase/migrations/0020_insta_init.sql`, `0021_insta_storage.sql`, `0022_insta_agents.sql` |
| 2 | 사이드바에 인스타 그룹 추가 | `src/components/sidebar.tsx` |
| 3 | `src/app/insta/layout.tsx` + `page.tsx` (여정 맵) | 셸 |
| 4 | `_lib/stages.ts`, `compass.ts`, `hashtags.ts` 상수 | |
| 5 | `lib/ai/insta/ideation.ts`·`brief.ts`·`writer.ts`·`designer.ts` | 에이전트 함수 |
| 6 | API 라우트 — `api/insta/*` | |
| 7 | UI 페이지 — `app/insta/*` 8개 | |
| 8 | Imagen 슬라이드 생성 + 텍스트 오버레이 합성 | |
| 9 | Graph API 발행 (`lib/insta/publish.ts`) | |
| 10 | Vercel Cron 예약 발행 | `vercel.json` + `api/cron/insta-publish` |
| 11 | 발행 후 metrics 동기화 (cron 1일 1회) | `api/cron/insta-metrics` |
| 12 | 환경변수 등록 (Vercel + 로컬) | |

각 단계를 별도 PR로 분할 권장.

---

## 10. 클로드에게 전달할 빌드 지시문

> 이 섹션을 그대로 복사해서 클로드에게 전달하세요.

```markdown
# 작업 지시 — 인스타 콘텐츠 파이프라인 구축

이 저장소는 PLOTT LIFE MKT (블로그 자동화 파이프라인) 프로젝트입니다.
이미 8단계 블로그 파이프라인이 동작 중입니다 (`/blog/*`).

이제 동일 패턴으로 **인스타그램 피드 콘텐츠 파이프라인** 을 추가하려 합니다.
첨부된 INSTA_PIPELINE_GUIDE.md 를 처음부터 읽고 12단계 마이그레이션 순서대로 구축하세요.

## 핵심 원칙
1. 블로그 파이프라인 코드 수정 X — 모든 인스타 코드는 `/insta`·`api/insta`·`lib/ai/insta` 등 별도 경로
2. DB 테이블 prefix `insta_` (insta_posts, insta_slides, insta_hashtags, insta_publications)
3. UI 디자인 토큰 (var(--brand-*) 등) 동일하게 사용 — 일관된 톤
4. AI 에이전트는 `insta-` prefix slug
5. PR 단위로 작업 (단계 1개당 1 PR)

## 시작 순서
1. INSTA_PIPELINE_GUIDE.md 9번 섹션 확인
2. DB 마이그레이션 3개 작성·실행 (`scripts/db-migrate.mjs supabase/migrations/0020_*.sql`)
3. 사이드바 + 여정 맵 페이지 추가 → PR 1
4. 트렌드 페이지 (mock 데이터부터) → PR 2
5. 아이데이션 페이지 (블로그 Compass 패턴 재사용 + 포맷 축 추가) → PR 3
6. 브리프 작성 + insta-strategist 에이전트 호출 → PR 4
7. 카드 제작 에디터 (슬라이드 분할 + Imagen) → PR 5
8. 검수 (블로그 review.ts 패턴 재사용 + 인스타 체크리스트) → PR 6
9. 콘텐츠 관리 (블로그 contents 패턴 그대로) → PR 7
10. 발행관리 + Graph API 발행 + Cron → PR 8
11. 성과분석 (mock → metrics sync) → PR 9

## 환경 준비
다음 환경변수가 .env.local + Vercel에 있어야 함:
- INSTAGRAM_BUSINESS_ACCOUNT_ID
- META_GRAPH_ACCESS_TOKEN
- META_APP_ID, META_APP_SECRET

없으면 사용자에게 발급 요청하세요 (Meta for Developers).

## 검증 기준
각 PR 끝에:
- `tsc --noEmit EXIT=0`
- 새 페이지 200 OK
- DB 변경 시 후속 query로 실제 행 확인
```

---

## 부록 — 블로그 파이프라인 요약

이미 구축된 부분 (참고용):

### 8단계
01 키워드 트렌드 / 02 아이데이션 / 03 브리프 작성 / 04 콘텐츠 제작 / 05 검수 / 06 콘텐츠 관리 / 07 발행관리 / 08 성과분석

### 핵심 라이브러리
- `src/lib/ai/provider.ts` — Vertex Express Mode (Gemini 2.5 + Imagen 4)
  - `thinkingBudget: 0` 으로 JSON 모드 잘림 방지
- `src/lib/ai/agents.ts` — runAgent 통합 (agent_runs 로그)
- `src/lib/ai/ideation.ts` — 3축 Compass 프롬프트
- `src/lib/ai/brief.ts` / `writer.ts` / `review.ts` / `image-gen.ts`
- `src/lib/ideation/compass.ts` — Intent · Stage · Season · Trigger · Pain 정의
- `src/app/blog/_ui/markdown-preview.tsx` — Table·Callout·Checklist 렌더링
- `src/app/blog/_lib/cache.ts` — localStorage SWR 미니 (5분 TTL)

### 디자인 토큰
- 컬러: `var(--brand-*)` (Indigo-Violet)
- 컴포넌트: `bcard` · `bbtn` · `bchip` · 페이지 헤더는 `PageHeader`
- 모달 backdrop: rgba(15,23,42,0.65) + blur 8px
- 카드 hover/그라데이션 일관

### 데이터 패턴
- `drafts.status` enum: drafting / reviewing / approved / scheduled / published / rewriting / discarded
- `drafts.metadata` jsonb: scheduled_at · published_at · channels · provider · model · scheduled_at
- localStorage 캐시 키: `plott-blog-cache:contents-all` 등
- Optimistic UI: 모든 mutation 후 즉시 setState + cache sync

인스타 파이프라인은 위 패턴을 그대로 가져다 `insta_*` 테이블·`/insta/*` 라우트로 복제하면 됩니다.

---

**작성**: 2026-04-27 / 플라트라이프 STAY 프로젝트
**참조 코드베이스 PR**: #1~#21 (블로그 파이프라인 구축 이력)
