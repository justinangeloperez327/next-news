# Next News

A responsive news-reader prototype built with Next.js App Router, TypeScript and Tailwind CSS.

## Features

- Source-attributed headlines linking directly to the original publisher
- Optional GNews API provider, with server-side key handling and 10-minute fetch caching
- Article validation, deduplication, sorting, and tracking-parameter removal
- Server-rendered pagination (up to GNews's 1,000-article cap) with safe navigation and provider-error handling
- Optional publisher-domain allow/block lists for editorial source curation
- World, Technology, Business, Science, Climate and Culture categories
- Global keyword search, responsive editorial layout and demo article pages
- Visible demo mode if the key is absent, and visible fallback if upstream data is unavailable
- Node.js 24 CI: lint, type checks, tests and production build

> **Not a live service until configured.** Without a key, the original evergreen demonstration stories are shown, clearly labeled. Provider publication availability depends on your subscription. The GNews Free plan is delayed by 12 hours and permits noncommercial development/testing only.

## Local development

Requires Node.js 24 and npm.

```bash
npm install
cp .env.example .env.local
# Set GNEWS_API_KEY in .env.local to enable external news.
npm run dev
```

Open http://localhost:3000.

## Provider configuration

1. Obtain your own API key at https://gnews.io/.
2. Configure the server-side `GNEWS_API_KEY` environment variable (in `.env.local` for development or your hosting platform's encrypted environment settings).
3. Start/restart your application. If the key is missing, demo mode remains active. If a configured provider fails, the UI explicitly reports that fallback demo stories are being displayed.

The key is sent to `gnews.io` in an `X-Api-Key` request header. It is not used in browser code or appended to URLs. Requests cache with `next.revalidate: 600` (10 minutes). Search results and category results have distinct cache keys. Upstream errors, rate limits, malformed data and network failures do not masquerade as current headlines.

The free GNews plan is for noncommercial development/testing and serves up to ten articles per request, with a 12-hour delay. Commercial/published projects require an appropriate paid subscription and must respect the copyright and other rights of the original publishers. News cards show title, short description, publisher, publication date and a link to the publisher; full third-party texts and images are not copied into this application.

### Category routing

- World, Technology, Business, Science: GNews top-headlines categories.
- Climate: search for `climate`.
- Culture: search for `culture OR arts`.
- A typed keyword search runs globally, independently of the selected category.
- Paging links retain the active search or category. On accounts where pagination is unavailable, later pages display a provider error and a link back to page one instead of fabricated content.

The same presentation works when no API key is present, using the local demonstration catalog.

### Source curation

Optionally set `NEWS_ALLOWED_DOMAINS` and/or `NEWS_BLOCKED_DOMAINS` in the **server** environment as comma-separated publisher URL hostnames. A block always takes precedence; when an allow list is present, only those hostnames and their subdomains are shown. Example:

```dotenv
NEWS_ALLOWED_DOMAINS=reuters.com,apnews.com
NEWS_BLOCKED_DOMAINS=example.invalid
```

Use bare domains without schemes or paths. Invalid entries are ignored. These lists are only technical curation controls, **not guarantees that a publisher or article is accurate**. Filtering occurs after each upstream page is retrieved; therefore pages may contain fewer than ten results. The API's reported `totalArticles` is not displayed as a curated result count. No additional provider requests are made to fill a filtered page.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

CI uses Node.js 24 with a committed `package-lock.json`, `npm ci`, ESLint, TypeScript validation, unit tests and production build. The lockfile was generated on Node.js 24 and should be updated when dependencies change.

## Architecture

- `src/app/`: App Router pages, article route and styles
- `src/components/`: navigation, publisher-linked headline cards, demo article cards and footer
- `src/lib/live-news.ts`: server-side GNews adapter, strict normalization, caching and fallback status
- `src/lib/live-news.test.ts`: mocked provider, pagination and domain-policy tests (no live API calls)
- `src/lib/feed-navigation.ts`: bounded page parsing and search/category-preserving links
- `src/lib/feed-navigation.test.ts`: pagination validation tests
- `src/lib/news.ts`: original labeled demo story catalog and filtering
- `src/lib/news.test.ts`: demo content/filter tests

## Next steps

Consider adding production monitoring, per-client rate limiting, provider quota metrics, source policy audits and an explicit publisher rights review before public release. This project is a reading UI, not a license to republish third-party reporting.
