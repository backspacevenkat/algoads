# AlgoAds

Retention-safe YouTube ad launcher built on Google Ads API v23 Demand Gen.

Give it a YouTube URL → Gemini writes the ad copy → one click launches a
paused Demand Gen campaign targeting tier-2 tech cities → live monitoring
in a Next.js dashboard.

Also ships with an MCP server so you can drive everything from chat in
Claude Code, Cursor, Windsurf, or Zed.

## Why this exists

The Google Ads ecosystem has:

- Lots of official reporting tools (DG-Pulse, ads-monitor, gaarf)
- Creative generation tools (Vigenair)
- An official read-only MCP server

…but **nothing official that writes Demand Gen campaigns via API**. This
project fills that gap and stitches the ecosystem together.

The v23 Demand Gen pipeline has 5 non-obvious gotchas that cost a full
debugging session to figure out:

1. `upgradedTargeting: true` moves geo/language criteria to the **ad group**
   level (campaign-level fails with the cryptic `OWNED_AND_OPERATED` error)
2. v23 renamed `start_date`/`end_date` → `startDateTime`/`endDateTime`
3. Ads require both `ad.name` AND at least one `logoImages` entry
4. Ad groups must not include a `type` field
5. v23 renamed video metrics (`video_views` → `video_trueview_views` etc.)

All five are encoded in `src/lib/google-ads/demand-gen.ts`.

## Features

**Dashboard (Next.js 16 + shadcn/ui):**
- Home: live list of campaigns with 7-day metrics
- `/launch`: paste YouTube URL → Gemini generates 5 headlines / 3 long / 3 descriptions → review & edit → upload logo → launch
- `/campaigns/[id]`: detail view with Recharts line graphs (impressions, clicks, cost, CTR over 14 days), ad group + ad status, pause/enable buttons

**MCP server (`mcp/algoads_mcp.py`):**
- `list_campaigns`, `get_campaign`, `get_campaign_metrics`
- `generate_creative` (Gemini + YouTube metadata)
- `enable_campaign`, `pause_campaign`, `delete_campaign`

**Safe-by-default settings:**
- Retention-safe channel controls (YouTube In-Feed only — no Skippable In-Stream)
- Tier-1 India tech cities as default targeting (10-50x cheaper CPC than US/UK)
- English language only
- `maximizeConversions` bidding with CPC cap
- All campaigns launch **PAUSED** — you review before enabling

## Setup

### 1. Install

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your Google Ads OAuth credentials, developer token,
customer ID, and `GOOGLE_AI_API_KEY` (Gemini). See `.env.example` for the
full list.

### 2. Local dev

```bash
npm run dev
# open http://localhost:3000
```

### 3. Deploy to Vercel

```bash
# one-time
vercel link
vercel env add GOOGLE_ADS_CLIENT_ID production
vercel env add GOOGLE_ADS_CLIENT_SECRET production
vercel env add GOOGLE_ADS_REFRESH_TOKEN production
vercel env add GOOGLE_ADS_DEVELOPER_TOKEN production
vercel env add GOOGLE_ADS_CUSTOMER_ID production
vercel env add GOOGLE_AI_API_KEY production

# deploy
vercel --prod
```

**Enable Vercel deployment protection** (Dashboard → Settings → Deployment
Protection → Standard Protection). This is the simplest way to keep your
Vercel URL private — only people with your Vercel account or a bypass token
can access the dashboard. The alternative would be building a full auth layer.

### 4. MCP server (optional — for chat-based control)

```bash
cd mcp
pip install -r requirements.txt

# For local dev:
export ALGOADS_BASE_URL=http://localhost:3000
# For deployed:
export ALGOADS_BASE_URL=https://your-project.vercel.app
export ALGOADS_API_TOKEN=<vercel-bypass-token-if-protection-on>

# Register with Claude Code
claude mcp add algoads python3 /absolute/path/to/mcp/algoads_mcp.py
```

Then in any Claude Code session:

> "List my campaigns and show me which ones are wasting budget"
> "Generate creative for this YouTube URL and launch a $5/day campaign"
> "Pause campaign 23743703489"

## Architecture

```
┌──────────────┐       ┌─────────────────┐
│  Next.js UI  │       │ MCP (Python)    │
│ (App Router) │       │ stdio server    │
└──────┬───────┘       └────────┬────────┘
       │                        │
       │    HTTP JSON           │
       ▼                        ▼
┌───────────────────────────────────────┐
│  Next.js API routes (/api/**)         │
│  src/app/api/**/route.ts              │
└───────────────┬───────────────────────┘
                │
                ▼
┌───────────────────────────────────────┐
│  lib/google-ads/                      │
│  - client.ts  (OAuth + REST helper)   │
│  - campaigns.ts (list/diagnose/...)   │
│  - demand-gen.ts (7-step create)      │
│  - geos.ts (verified geo IDs)         │
│  lib/gemini/                          │
│  - generate-creative.ts               │
└───────────────┬───────────────────────┘
                │
                ▼
  Google Ads API v23 REST  +  Gemini API
```

## Project structure

```
algoads/
├── src/
│   ├── app/
│   │   ├── page.tsx               # Dashboard home
│   │   ├── launch/                # Campaign launcher flow
│   │   ├── campaigns/[id]/        # Detail page with Recharts
│   │   └── api/                   # Route handlers
│   ├── components/ui/             # shadcn primitives
│   ├── lib/
│   │   ├── google-ads/            # Google Ads API v23 client
│   │   ├── gemini/                # Creative generation
│   │   ├── logger.ts              # Structured JSON logging
│   │   └── utils.ts               # cn() + formatters
├── mcp/
│   ├── algoads_mcp.py             # MCP server (Python)
│   └── requirements.txt
├── .env.example
├── next.config.ts
└── package.json
```

## Troubleshooting

Most common issues:

- **`OWNED_AND_OPERATED` trigger** → geo/language at ad group level, not campaign
- **`DATE_RANGE_ERROR_END_TIME_MUST_BE_THE_END_OF_A_DAY`** → set end to `23:59:59`
- **`MUTATE_NOT_ALLOWED` with trigger `VIDEO`** → legacy Video campaigns are API-locked; use Demand Gen
- **`USER_PERMISSION_DENIED`** → omit the `login-customer-id` header when your OAuth user has direct access

## License

MIT
