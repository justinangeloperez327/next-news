# Next News

Editorial news-reader prototype built with Next.js App Router, TypeScript, React 19, and Tailwind CSS 4.

## Features

- Optional GNews-backed headline feed (source, publication date, preview, original publisher link)
- Category, keyword, country and page navigation
- Publisher URL validation, title/URL deduplication, and optional source allow/block lists
- **Local browser storage:** saved articles, preferred topic shortcuts, and recent feed snapshots
- **For You** discovery page assembled from previously loaded local snapshots — no additional provider API calls
- Three text-size choices on original demo article pages; preference saved per browser
- When upstream is unavailable, optionally show a clearly labeled local snapshot previously visited in the **same browser**
- 10-minute server-side Next.js feed cache to avoid unnecessary upstream requests
- Structured server-side provider logs and `GET /api/health`
- Node.js 24, npm lockfile, lint, typecheck, unit tests, and production-build CI

This remains a prototype until a live GNews key is configured. Demo articles are clearly labeled as original examples. News cards link to the publisher; no full third-party articles or licensed photographs are stored.

## Getting started

Requires Node.js 24.

```bash
npm ci
cp .env.example .env.local
# Set GNEWS_API_KEY in .env.local for external headlines
npm run dev
```

Open http://localhost:3000. Without a key, demonstration content is displayed.

## Optional provider setup

Create a key at https://gnews.io/ and configure `GNEWS_API_KEY` **on the server only**. GNews free access is designed for development/testing, with reduced capacity and delayed results. Ensure your plan permits your intended deployment.

Optional publisher curation:

```dotenv
NEWS_ALLOWED_DOMAINS=reuters.com,apnews.com
NEWS_BLOCKED_DOMAINS=example.invalid
```

Use bare domain names, without schemes or paths. The allow and block lists filter results *after* retrieval. A source allowlist is editorial curation, not a verification guarantee.

## Group 4: discovery and comfortable reading

The `/for-you` page uses only the browser's previously loaded news snapshots. Selecting topic preferences narrows the collection to previously seen matching article categories. No new remote news requests are made by this page. Results are visibly marked as cached and are not described as breaking or live news.

Original demonstration articles offer Standard, Large and Extra-large text size. The selected size persists locally, does not require an account and does not alter third-party publisher websites. Your browser remains the only store for these preferences.

## Browser-only storage

**No Redis, database, user accounts, or external cache service is required.**

- `next-news:v1:saved`: up to 80 publisher-linked saved articles; title, preview, original URL, publisher, timestamp and category.
- `next-news:v1:topics`: saved category preferences; links to the selected categories appear on the homepage.
- `next-news:v1:reading-size`: demo-article font size preference.
- `next-news:v1:feed-index`: local change marker used by the personalized discovery view.
- `next-news:v1:feed:...`: up to 20 recent feed snapshots, each containing at most 20 linked headlines. Each snapshot is identified by category, normalized query, page and country.

Snapshots are normally considered fresh for **15 minutes** and may be displayed as a labeled older copy when the provider fails, for **up to 24 hours**. The UI never represents a browser snapshot as a live update. A successful live response updates the snapshot after hydration. Expired, malformed, or unsafe stored snapshots are ignored; write errors (private browsing, restricted storage or quota exhaustion) are handled without stopping the application.

These data remain **only in the visitor's current browser profile and device**. They are not synchronized, backed up, encrypted, or available to the server. Clearing browser data or changing devices will remove them. Never store API keys or confidential data in browser storage.

**Important distinction:** `localStorage` is a browser feature, not a server-wide rate limiter. It does not prevent server fetches, enforce GNews quotas across visitors, or replace server caching. The existing Next.js server cache and GNews HTTP fetch revalidation (10 minutes) remain; production traffic still needs appropriate provider quota controls, CDN/WAF protection and alerting.

## Operational behavior

- GNews is called from server-side code only. The API key is passed through a request header, not a URL.
- Unauthorized, quota-exhausted, throttled, invalid-data, and network responses remain distinct in server logs and the UI.
- The homepage uses a 10-minute cached provider response across category, query, page and country. Provider errors can remain cached until revalidation.
- `GET /api/health` returns `{status:"ok",feedMode:"demo"|"configured",browserCache:"localStorage"}` and does not probe GNews or the visitor's browser.
- Browser cache is only read after hydration. On an unavailable provider, the page can show *both* a labeled earlier browser snapshot and original demo articles. Neither is live news.
- Regional editions select source countries where the GNews plan supports them, not necessarily article topics.

## Development checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

CI runs on Node.js 24 using `npm ci`. A separate browser job installs Chromium and tests real navigation, `localStorage` persistence, saved-article removal and local discovery against the production server. No deployment is triggered.

## Project layout

- `src/lib/live-news.ts`: server-side GNews adapter, validation and provider status
- `src/lib/cached-feed.ts`: Next.js server response cache
- `src/lib/browser-storage.ts`: pure, validated localStorage data/TTL/bookmark/preferences functions
- `src/lib/browser-events.ts`: cross-tab and same-tab browser storage subscriptions
- `src/lib/local-discovery.ts`: validated local headline discovery, deduplication and topic filtering
- `src/components/for-you-list.tsx`: browser-only personalized collection
- `src/components/reader-controls.tsx`: demo-article reading preferences
- `src/components/browser-feed-cache.tsx`: stores received news and renders older snapshots on provider failures
- `src/components/save-article-button.tsx`: saved article controls
- `src/components/topic-preferences.tsx`: local topic shortcuts
- `src/app/saved/page.tsx`: saved-article library
- `src/app/api/health/route.ts`: configuration-only status
- `src/lib/*.test.ts`: validation, filtering and storage tests

## Production considerations

Before public release: confirm content-licensing terms, implement reliable provider quota enforcement and operational alerting if traffic requires them, ensure security headers and add automated end-to-end tests. Browser-only storage is a deliberate prototype decision.
