import { MAX_FEED_PAGE } from "./feed-navigation.ts";
import type { Category } from "./news.ts";

export const FEED_REVALIDATE_SECONDS = 600;
export const FEED_PAGE_SIZE = 10;

export type LiveCategory = Category | "Top Stories";

export interface LiveArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  sourceName: string;
  publishedAt: string;
  category: LiveCategory;
}

export type LiveFeedResult =
  | { status: "demo" }
  | { status: "unavailable"; reason: "authorization" | "rate-limit" | "upstream" | "invalid-data" | "network" }
  | { status: "live"; articles: LiveArticle[]; page: number; hasNextPage: boolean };

export type SourcePolicy = {
  allowedDomains?: readonly string[];
  blockedDomains?: readonly string[];
};

type Filters = { category?: Category; query?: string; page?: number };
type Dependencies = { apiKey?: string; fetcher?: typeof fetch; sourcePolicy?: SourcePolicy };

const CATEGORY_ENDPOINTS: Record<Category, { kind: "top"; category: string } | { kind: "search"; query: string }> = {
  World: { kind: "top", category: "world" },
  Technology: { kind: "top", category: "technology" },
  Business: { kind: "top", category: "business" },
  Science: { kind: "top", category: "science" },
  Climate: { kind: "search", query: "climate" },
  Culture: { kind: "search", query: "culture OR arts" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizedText(value: unknown, maxLength: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

/** Remove known tracking parameters while retaining other publisher query parameters. */
export function canonicalUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return;
    if (url.username || url.password) return;
    if (!url.hostname.includes(".") || url.hostname.endsWith(".local")) return;
    url.hash = "";
    for (const name of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(name) || ["fbclid", "gclid", "mc_cid", "mc_eid"].includes(name.toLowerCase())) {
        url.searchParams.delete(name);
      }
    }
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return;
  }
}

export function parseSourceDomains(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase().replace(/\.$/, ""))
    .filter((domain) => /^(?:[a-z0-9-]+\.)+[a-z]{2,63}$/.test(domain));
}

function matchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith("." + domain);
}

export function isSourceAllowed(url: string, policy: SourcePolicy = {}): boolean {
  const hostname = new URL(url).hostname.toLowerCase().replace(/\.$/, "");
  const allowed = policy.allowedDomains ?? [];
  const blocked = policy.blockedDomains ?? [];
  if (blocked.some((domain) => matchesDomain(hostname, domain))) return false;
  if (allowed.length > 0 && !allowed.some((domain) => matchesDomain(hostname, domain))) return false;
  return true;
}

/**
 * Keep only titles, excerpts, publisher names, timestamps and outbound links.
 * No publisher-owned images or full-text are copied into Next News.
 */
export function normalizeArticles(
  value: unknown,
  category: LiveCategory,
  policy: SourcePolicy = {},
): LiveArticle[] {
  if (!isRecord(value) || !Array.isArray(value.articles)) {
    throw new Error("Invalid news feed payload");
  }

  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const articles: LiveArticle[] = [];

  for (const item of value.articles) {
    if (!isRecord(item) || !isRecord(item.source)) continue;
    const title = normalizedText(item.title, 240);
    const url = canonicalUrl(item.url);
    const sourceName = normalizedText(item.source.name, 100);
    const published = typeof item.publishedAt === "string" ? Date.parse(item.publishedAt) : NaN;

    if (!title || !url || !sourceName || !Number.isFinite(published)) continue;
    // Small clock skew is acceptable, but articles dated in the future are not.
    if (published > Date.now() + 10 * 60 * 1000) continue;
    if (!isSourceAllowed(url, policy)) continue;

    const titleKey = title.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
    if (seenUrls.has(url) || seenTitles.has(titleKey)) continue;

    seenUrls.add(url);
    seenTitles.add(titleKey);
    articles.push({
      id: url,
      title,
      description: normalizedText(item.description, 280),
      url,
      sourceName,
      publishedAt: new Date(published).toISOString(),
      category,
    });
  }

  return articles.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** Server-side GNews adapter. Never log, cache into public markup, or expose the API key. */
export async function getLiveFeed(
  filters: Filters = {},
  dependencies: Dependencies = {},
): Promise<LiveFeedResult> {
  const apiKey = (dependencies.apiKey ?? process.env.GNEWS_API_KEY ?? "").trim();
  if (!apiKey) return { status: "demo" };

  const page = Number.isSafeInteger(filters.page) && (filters.page ?? 0) >= 1 && (filters.page ?? 0) <= MAX_FEED_PAGE
    ? filters.page!
    : 1;
  const query = filters.query?.trim().slice(0, 100) ?? "";
  const category: LiveCategory = query ? "Top Stories" : filters.category ?? "Top Stories";
  const endpoint = filters.category && !query ? CATEGORY_ENDPOINTS[filters.category] : undefined;
  const useSearch = Boolean(query) || endpoint?.kind === "search";

  const url = new URL(useSearch ? "https://gnews.io/api/v4/search" : "https://gnews.io/api/v4/top-headlines");
  url.searchParams.set("lang", "en");
  url.searchParams.set("max", String(FEED_PAGE_SIZE));
  url.searchParams.set("page", String(page));
  if (useSearch) {
    url.searchParams.set("q", query || (endpoint?.kind === "search" ? endpoint.query : ""));
    url.searchParams.set("sortby", "publishedAt");
  } else {
    url.searchParams.set("category", endpoint?.kind === "top" ? endpoint.category : "general");
  }

  try {
    const response = await (dependencies.fetcher ?? fetch)(url.toString(), {
      headers: { "X-Api-Key": apiKey, Accept: "application/json" },
      next: { revalidate: FEED_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(8_000),
    });

    if (!response.ok) {
      return {
        status: "unavailable",
        reason: [401, 403].includes(response.status) ? "authorization" : response.status === 429 ? "rate-limit" : "upstream",
      };
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload) || !Array.isArray(payload.articles)) {
      return { status: "unavailable", reason: "invalid-data" };
    }
    const policy = dependencies.sourcePolicy ?? {
      allowedDomains: parseSourceDomains(process.env.NEWS_ALLOWED_DOMAINS),
      blockedDomains: parseSourceDomains(process.env.NEWS_BLOCKED_DOMAINS),
    };
    const articles = normalizeArticles(payload, category, policy);
    const total = payload.totalArticles;
    const validTotal = typeof total === "number" && Number.isSafeInteger(total) && total >= 0;
    const hasNextPage = validTotal && articles.length > 0
      && page < MAX_FEED_PAGE && page * FEED_PAGE_SIZE < Math.min(total, 1_000);

    return { status: "live", articles, page, hasNextPage };
  } catch {
    // Timeouts, invalid JSON and network failures should not appear as live headlines.
    return { status: "unavailable", reason: "network" };
  }
}
