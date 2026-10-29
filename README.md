# Next News

A modern editorial-style news frontend built with Next.js App Router, TypeScript and Tailwind CSS.

> **Development status:** This starter uses clearly labeled demonstration articles. No live news source is connected yet; it does not claim to display breaking news.

## Features

- Responsive editorial homepage and story pages
- Category navigation and keyword search
- Accessible semantic navigation and article markup
- Server-rendered views with no database or API credentials required
- Automated lint, type checks, tests and build on Node.js 24

## Getting started

Requires Node.js 24 and npm.

```bash
npm install
npm run dev
```

Open http://localhost:3000

### Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Until a dependency lockfile is committed, CI installs dependencies with `npm install` rather than `npm ci`. Commit a generated `package-lock.json` before switching CI to `npm ci`.

## Architecture

- `src/app/`: Next.js App Router pages, metadata and global styles
- `src/components/`: reusable editorial UI components
- `src/lib/news.ts`: typed story catalog and search/filter functions; a replacement boundary for a future news API
- `src/lib/news.test.ts`: standalone tests using Node's built-in test runner

## Next steps

Connect a licensed news API or RSS feeds with attribution, content licensing checks, caching, deduplication, source reliability, and publication timestamps. Keep API keys server-side. Do not scrape or republish entire articles without permission.
