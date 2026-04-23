# Google Ads API — Design Document

**Applicant:** Plottlife (handys Co., Ltd.)
**Website:** https://life.plott.co.kr
**Internal tool:** PLOTTLIFE-MKT Agent
**Prepared for:** Google Ads API Basic Access Application
**Date:** 2026-04

---

## 1. Executive Summary

Plottlife is a Korea-based short-term rental platform (1–20 week stays).
We are building an internal marketing dashboard for our content team
to plan SEO-driven blog articles. To understand search demand across
Korean and English-speaking audiences, we query monthly search volume,
competition, and country-level interest using:

1. **Naver Search Ads API** (already integrated) — Korean market
2. **Google Ads API — Keyword Planner Service** (this application) —
   English-speaking and overseas audiences

The Google Ads API token will be used **exclusively for read-only
keyword research**. No Google Ads campaigns are created, edited, bid,
or served through this token.

---

## 2. Business Context

Our primary audiences include:

- International students (D-2 / D-4 visa holders)
- Corporate expats on short assignments
- Digital nomads and travelers on one-month stays
- Domestic residents in transitional housing situations

Many of these audiences search Google in English for terms such as
`short term rental seoul`, `no deposit rental korea`, `student housing
korea`. The Naver Search Ads API cannot surface these queries because
Naver is Korean-language dominant and returns `< 10` impressions for
English keywords.

The Google Ads Keyword Planner is the only data source that provides
monthly search volume, competition level, and geographic breakdown for
English queries targeting our market.

---

## 3. High-Level Architecture

```
┌───────────────────────────────────────────────────────────────┐
│            Internal Marketing Dashboard (Next.js)             │
│              (deployed at Vercel, HTTPS only)                 │
└────────────┬──────────────────────────────────────┬───────────┘
             │                                      │
             │ Server-side                          │ Server-side
             │ (Next.js Route Handlers)             │
             ▼                                      ▼
┌──────────────────────────┐         ┌─────────────────────────┐
│    Naver Search Ads      │         │   Google Ads API        │
│   (/keywordstool)        │         │  KeywordPlanIdeaService │
│   Korean keywords        │         │  English keywords       │
└──────────────────────────┘         └─────────────────────────┘
             │                                      │
             └──────────────┬───────────────────────┘
                            ▼
              ┌──────────────────────────┐
              │    Supabase Postgres     │
              │  research_sources table  │
              │ (server access only, RLS)│
              └──────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────┐
              │    Internal Dashboard    │
              │ /blog/research (Next.js) │
              │  Employee-only access    │
              └──────────────────────────┘
```

All Google Ads API calls occur **server-side** from our Next.js Route
Handlers. API credentials are never exposed to browsers. Client-side
code communicates only with our own `/api/*` endpoints and never with
Google’s endpoints directly.

---

## 4. API Usage — Scope and Endpoints

### 4.1 Service and Method

We use a single Google Ads API service and method:

- **Service:** `KeywordPlanIdeaService`
- **Method:** `GenerateKeywordHistoricalMetrics` (and optionally
  `GenerateKeywordIdeas` for related-term expansion)

No other Google Ads services or methods are invoked. We **do not** use:

- `CampaignService` / `AdGroupService` / `AdService` (no campaign mgmt)
- `GoogleAdsService` mutate operations
- `ConversionActionService` / `RemarketingActionService`
- Customer creation endpoints

### 4.2 Request pattern

- Input: up to 20 Korean or English keywords per request
- Target language: `ko` (Korean) or `en` (English)
- Target geo constants: South Korea, plus supplementary markets
  (Vietnam, Indonesia, China, United States, Japan) for English queries
- Network: Google Search only
- `includeAdultKeywords`: false

### 4.3 Expected call volume

- **1,000 – 5,000 requests per month**
- Triggered manually by content team (roughly 20–50 keywords refreshed
  per week) and via a nightly cron job that refreshes top 100 seed
  keywords once every 7 days.
- Retry logic: exponential backoff (1s / 2s / 4s) on quota errors.

### 4.4 What we never do

- No campaign creation, editing, or serving
- No bid modification
- No data resale, redistribution, or bulk export to external parties
- No end-user-facing queries (all queries originate from internal staff)

---

## 5. Data Handling & Storage

### 5.1 What we store

| Field | Source |
|---|---|
| `keyword` | Request input |
| `monthly_search_volume` | Google Ads API response |
| `competition_level` | Google Ads API response |
| `top_of_page_bid_low / high` (optional) | Google Ads API response |
| `country_breakdown` (optional, from our own aggregation) | derived |
| `enriched_at` timestamp | server clock |

### 5.2 Where we store it

- **Database:** Supabase (PostgreSQL), hosted on AWS `ap-northeast-2`.
- **Table:** `research_sources` with `kind = 'keyword'`.
- **Access:** Row Level Security enabled; direct access is blocked for
  the anonymous client. All reads/writes occur via our authenticated
  server API routes using the `service_role` key held only on the
  server.

### 5.3 Retention & deletion

- Keyword rows are refreshed in place (upsert), not appended.
- Historical metric snapshots are not retained unless explicitly
  requested by a team member.
- On account termination or Google’s request, the team can purge all
  `research_sources` rows with a single SQL statement.

---

## 6. Security & Access Control

### 6.1 Credentials handling

- Developer token, OAuth client secret, and refresh token are stored as
  **server-side environment variables** on Vercel (Production +
  Preview), never in git, never in browser bundles.
- Environment variables are **not** prefixed with `NEXT_PUBLIC_`, so
  Next.js excludes them from the client bundle at compile time.
- `src/lib/ads/google-ads.ts` wrapper imports `server-only`, which
  causes a build-time error if accidentally imported into a client
  component.

### 6.2 OAuth scope and token lifecycle

- OAuth scope: `https://www.googleapis.com/auth/adwords`
- Refresh token is obtained once via offline OAuth flow and stored
  server-side.
- No user-facing OAuth prompts (the tool has no third-party users).

### 6.3 User access to the dashboard

- The dashboard at `/blog/research` is available only on our internal
  Vercel deployment.
- All authentication to the dashboard is gated behind company SSO /
  internal credentials.
- No public API exposes Google Ads data.

---

## 7. Compliance

We commit to comply with:

- **Google Ads API Policies and Required Minimum Functionality**
  (https://developers.google.com/google-ads/api/docs/policies/required-minimum-functionality)
  — As a read-only tool, the MRF requirements that apply to campaign
  management tools do not apply. However, we observe all general API
  policies (no resale, appropriate usage, attribution).
- **Google API Services User Data Policy** — We do not store any
  Google user data beyond the keyword metrics returned by the API.
- **Personal Information Protection Act (PIPA, Korea)** — No personal
  data is transmitted to or stored from the Google Ads API.
- **Terms and Conditions** accepted via the application form.

---

## 8. Appendix — Sample request / response

Sample `KeywordPlanIdeaService.GenerateKeywordHistoricalMetrics`
request (Node, `google-ads-api` client):

```ts
const customer = client.Customer({
  customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
  login_customer_id: process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID,
  refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
})

const result = await customer.keywordPlanIdeas.generateKeywordHistoricalMetrics({
  keywords: ["short term rental seoul", "no deposit rental korea"],
  language: "languageConstants/1000", // English
  geo_target_constants: ["geoTargetConstants/2410"], // South Korea
  include_adult_keywords: false,
})
// → [{ text: "short term rental seoul", keyword_metrics: { avg_monthly_searches, competition, ... } }]
```

---

**Contact**
- API contact: julian.kim@handys.co.kr
- Company: handys Co., Ltd. (Plottlife)
- Website: https://life.plott.co.kr
