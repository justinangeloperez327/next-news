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
  | { status: "unavailable" }
  | { status: "live"; articles: LiveArticle[] };

type Filters = { category?: Category; query?: string };
type Dependencies = { apiKey?: string; fetcher?: typeof fetch };

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

/** Remove known tracking parameters without modifying URLs used for navigation. */
export function canonicalUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return;
    if (url.username || url.password) return;
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

/**
 * Keep only the fields required for a linked headline card.
 * Do not republish provider full text or publisher-owned photographs.
 */
export function normalizeArticles(value: unknown, category: LiveCategory): LiveArticle[] {
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
    if (published > Date.now() + 24 * 60 * 60 * 1000) continue;

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

/**
 * All requests originate on the server. Secrets are transmitted through a header,
 * never a browser-visible URL or NEXT_PUBLIC_ variable.
 */
export async function getLiveFeed(
  filters: Filters = {},
  dependencies: Dependencies = {},
): Promise<LiveFeedResult> {
  const apiKey = (dependencies.apiKey ?? process.env.GNEWS_API_KEY ?? "").trim();
  if (!apiKey) return { status: "demo" };

  const query = filters.query?.trim().slice(0, 100) ?? "";
  const category: LiveCategory = query ? "Top Stories" : filters.category ?? "Top Stories";
  const endpoint = filters.category && !query ? CATEGORY_ENDPOINTS[filters.category] : undefined;
  const useSearch = Boolean(query) || endpoint?.kind === "search";

  const url = new URL(useSearch ? "https://gnews.io/api/v4/search" : "https://gnews.io/api/v4/top-headlines");
  url.searchParams.set("lang", "en");
  url.searchParams.set("max", String(FEED_PAGE_SIZE));
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

    if (!response.ok) return { status: "unavailable" };

    const payload: unknown = await response.json();
    return { status: "live", articles: normalizeArticles(payload, category) };
  } catch {
    // Invalid API responses, timeouts, and upstream failures must never be shown
    // as current news or expose credentials to visitors.
    return { status: "unavailable" };
  }
}
