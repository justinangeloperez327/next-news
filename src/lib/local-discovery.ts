import { CATEGORIES, type Category } from "./news.ts";
import type { LiveArticle } from "./live-news.ts";
import { readFeedSnapshot, type FeedIdentity, type StorageLike } from "./browser-storage.ts";
import { parseNewsCountry } from "./regions.ts";

const PREFIX = "next-news:v1:feed:";
export const RECENT_DISCOVERY_LIMIT = 18;

export type LocalDiscoveryArticle = { article: LiveArticle; cachedAt: number };

/** Decodes only application-created cache keys; arbitrary localStorage content is untrusted. */
export function decodeFeedKey(key: string): FeedIdentity | undefined {
  if (!key.startsWith(PREFIX)) return;
  try {
    const value: unknown = JSON.parse(decodeURIComponent(key.slice(PREFIX.length)));
    if (!Array.isArray(value) || value.length !== 4) return;
    const [category, query, page, country] = value;
    if (typeof category !== "string" || typeof query !== "string" || query.length > 100 ||
        !Number.isSafeInteger(page) || page < 1 || page > 100 || typeof country !== "string" ||
        country !== parseNewsCountry(country) ||
        (category !== "" && !CATEGORIES.includes(category as Category))) return;
    if (query && category) return;
    return {
      category: category ? category as Category : undefined,
      query: query || undefined,
      page,
      country: country as FeedIdentity["country"],
    };
  } catch {
    return;
  }
}

/**
 * Reads only previously visited, validated browser snapshots. Never fetches
 * a news provider, pretends that an article is live, or processes full text.
 */
export function readLocalDiscoveries(
  storage: StorageLike,
  topics: readonly Category[] = [],
  now = Date.now(),
): LocalDiscoveryArticle[] {
  const merged = new Map<string, LocalDiscoveryArticle>();
  if (typeof storage.length !== "number" || !storage.key) return [];
  const count = Math.min(storage.length, 2_000);
  try {
    for (let index = 0; index < count; index++) {
      const key = storage.key(index);
      if (!key) continue;
      const filters = decodeFeedKey(key);
      if (!filters) continue;
      const snapshot = readFeedSnapshot(storage, filters, now);
      if (!snapshot) continue;
      for (const article of snapshot.articles) {
        if (topics.length > 0 && !topics.some((topic) => topic === article.category)) continue;
        const current = merged.get(article.url);
        if (!current || current.cachedAt < snapshot.savedAt) {
          merged.set(article.url, { article, cachedAt: snapshot.savedAt });
        }
      }
    }
  } catch {
    return []; // browser storage blocked during enumeration
  }
  return [...merged.values()]
    .sort((a, b) => b.article.publishedAt.localeCompare(a.article.publishedAt) || b.cachedAt - a.cachedAt)
    .slice(0, RECENT_DISCOVERY_LIMIT);
}
