# AlgoAds — Google Ads API Design Document

**Company:** Algo Thinker
**Product:** AlgoAds — Demand Gen Campaign Automation for YouTube Video Promotion
**Website:** https://algo-thinker.com
**API Use Case Page:** https://algo-thinker.com/ads-api
**Privacy Policy:** https://algo-thinker.com/privacy
**Terms of Service:** https://algo-thinker.com/terms
**Developer Contact:** api@algo-thinker.com
**Date:** April 2026

---

## 1. Product Overview

AlgoAds is a web-based tool that automates the creation of Google Ads Demand Gen video campaigns for YouTube content creators. It reduces the campaign setup time from 1-2 hours (manual Google Ads UI) to under 5 minutes while keeping the creator in full control of their account, budget, and creative.

**Target users:** YouTube content creators who want to promote their own videos via Google Ads but lack the expertise to navigate the full Google Ads interface.

**Business model:** AlgoAds is currently free during beta. Revenue model TBD (potential SaaS subscription for creators). AlgoAds is NOT a Google Ads reseller and does NOT handle billing.

---

## 2. User Flow

### Step 1: Authentication
- User signs into AlgoAds via email/password (managed by InsForge auth backend)
- User connects their Google Ads account via OAuth 2.0 (standard Google consent flow)
- AlgoAds receives a refresh token scoped to the user's Google Ads account
- Refresh token is stored encrypted at rest in our database

### Step 2: Creative Generation
- User pastes a YouTube video URL
- AlgoAds reads public video metadata (title, description, thumbnail) via YouTube oEmbed
- AlgoAds sends video metadata to Google Gemini API to generate ad copy:
  - 3-5 headlines (max 40 chars each)
  - 1-5 long headlines (max 90 chars each)
  - 1-5 descriptions (max 90 chars each)
  - Business name suggestion
- User reviews and edits all generated copy before proceeding

### Step 3: Campaign Configuration
- User sets daily budget (USD)
- User sets campaign duration (days)
- User uploads a square logo image (min 300x300, PNG or JPG)
- Default targeting: 65 countries (Global South tech markets), English language, YouTube in-feed channel only

### Step 4: Campaign Launch via Google Ads API
AlgoAds creates the campaign using a 7-step pipeline, all via the Google Ads REST API v23:

| Step | API Endpoint | What It Creates |
|------|-------------|----------------|
| 1 | `campaignBudgets:mutate` | Daily budget resource |
| 2 | `campaigns:mutate` | Demand Gen campaign (PAUSED by default, targetSpend bidding) |
| 3 | `adGroups:mutate` | Ad group with channel controls (YouTube in-feed only) |
| 4 | `adGroupCriteria:mutate` | Geo targeting (65 countries) + language targeting (English) |
| 5 | `assets:mutate` | YouTube video asset + logo image asset |
| 6 | (inline) | Text assets (headlines, descriptions) are inline in the ad |
| 7 | `adGroupAds:mutate` | DemandGenVideoResponsiveAd with all assets |

Campaign is created PAUSED. User enables it from the AlgoAds dashboard.

### Step 5: Dashboard & Management
- User views campaign list with live metrics queried via GAQL:
  - `SELECT campaign.id, campaign.name, campaign.status, metrics.impressions, metrics.clicks, metrics.video_views, metrics.cost_micros FROM campaign WHERE campaign.id = {id}`
- User can pause, enable, or remove campaigns via `campaigns:mutate` (status change)

---

## 3. Google Ads API Endpoints Used

### Read Operations
| Endpoint | Purpose | Trigger |
|----------|---------|---------|
| `customers/{id}/googleAds:search` (GAQL) | Query campaign list, status, metrics | Dashboard page load |
| `customers/{id}/googleAds:search` (GAQL) | Query ad group status | Campaign detail page |
| `geoTargetConstants` | Look up geo target IDs for new cities | Admin function (rare) |

### Write Operations
| Endpoint | Purpose | Trigger |
|----------|---------|---------|
| `campaignBudgets:mutate` | Create daily budget | User clicks "Launch" |
| `campaigns:mutate` | Create campaign (PAUSED) / change status | User clicks "Launch" or "Pause"/"Enable" |
| `adGroups:mutate` | Create ad group with channel controls | User clicks "Launch" |
| `adGroupCriteria:mutate` | Set geo + language targeting | User clicks "Launch" |
| `assets:mutate` | Upload YouTube video + logo image | User clicks "Launch" |
| `adGroupAds:mutate` | Create DemandGenVideoResponsiveAd | User clicks "Launch" |

### What We Do NOT Use
- We do NOT use the Reporting API for bulk data extraction
- We do NOT use the Remarketing or Customer Match APIs
- We do NOT use the Bidding Strategy Service (we use inline campaign-level bidding)
- We do NOT use the Conversion Tracking API
- We do NOT access or modify account-level settings
- We do NOT manage campaigns on behalf of other advertisers

---

## 4. Data Flow Diagram

```
User (YouTube Creator)
  |
  |  1. Sign in (email/password via InsForge)
  |  2. Connect Google Ads (OAuth 2.0)
  |
  v
AlgoAds Server (Next.js on Vercel)
  |
  |  3. Store encrypted refresh token
  |  4. User pastes YouTube URL
  |  5. Generate creative via Gemini API
  |  6. User reviews + clicks Launch
  |
  |--- Google Ads API v23 (REST) ---------> User's Google Ads Account
  |    - Create budget                       - Campaign runs here
  |    - Create campaign (PAUSED)            - Billed to user's payment method
  |    - Create ad group                     - User owns everything
  |    - Set geo/language targeting
  |    - Upload video + logo assets
  |    - Create video responsive ad
  |
  |--- Google Gemini API -----------------> Generate ad copy suggestions
  |    - Send: video title, description       (public metadata only)
  |    - Receive: headlines, descriptions
  |
  |--- YouTube oEmbed --------------------> Read public video metadata
       - Send: video URL
       - Receive: title, thumbnail URL
```

---

## 5. Authentication Flow

```
1. User clicks "Connect Google Ads"
2. AlgoAds redirects to Google OAuth consent screen
   - Scope: https://www.googleapis.com/auth/adwords
3. User grants consent
4. Google redirects back with authorization code
5. AlgoAds exchanges code for refresh token (server-side)
6. Refresh token stored encrypted in database
7. On each API call: AlgoAds uses refresh token to get short-lived access token
8. Access token used in Authorization header for Google Ads API calls
```

User can revoke access at any time via https://myaccount.google.com/permissions

---

## 6. Data Storage

| Data | Where Stored | Encryption | Retention |
|------|-------------|------------|-----------|
| User email + name | InsForge (managed DB) | Encrypted at rest | Until account deletion |
| Google Ads refresh token | InsForge (managed DB) | Encrypted at rest | Until revocation or deletion |
| Google Ads customer ID | InsForge (managed DB) | Encrypted at rest | Until account deletion |
| Campaign IDs + names | InsForge (managed DB) | Encrypted at rest | Until account deletion |
| Campaign metrics | NOT stored | N/A | Queried live via GAQL |
| Logo images | Uploaded to user's Google Ads account | N/A | Deleted from our server after upload |
| Usage logs | Vercel server logs | Standard | 30 days |

---

## 7. Rate Limiting & Error Handling

- AlgoAds creates at most 1 campaign per user action (no bulk operations)
- API calls are sequential within a pipeline (7 steps)
- If any step fails, the pipeline rolls back by removing the budget resource
- Standard exponential backoff on transient errors (429, 503)
- Daily API call volume: < 100 calls/day (small user base, no batch operations)

---

## 8. Compliance

- **Google API Services User Data Policy:** AlgoAds adheres to the Limited Use requirements. Google user data is used only to provide the campaign management service.
- **Privacy Policy:** https://algo-thinker.com/privacy
- **Terms of Service:** https://algo-thinker.com/terms
- **Data deletion:** Users can request full account deletion via privacy@algo-thinker.com

---

## 9. Screenshots

The AlgoAds interface consists of four main screens:

1. **Launch page** — User pastes YouTube URL, generates creative with Gemini, reviews headlines/descriptions, sets budget, and clicks Launch
2. **Campaign list** — Shows all campaigns with live metrics (impressions, clicks, cost)
3. **Campaign detail** — Individual campaign view with pause/enable controls
4. **Login/Signup** — Standard auth flow with Google OAuth for Ads connection

Screenshots and a working demo are available at https://algo-thinker.com (sign in required for authenticated pages; public pages include the home page, /ads-api, /privacy, and /terms).
