import type { Category } from "./news.ts";
import { CATEGORIES } from "./news.ts";
import type { LiveArticle } from "./live-news.ts";
import type { NewsCountry } from "./regions.ts";

export const SAVED_KEY = "next-news:v1:saved";
export const TOPICS_KEY = "next-news:v1:topics";
export const FEED_INDEX_KEY = "next-news:v1:feed-index";
const FEED_PREFIX = "next-news:v1:feed:";
export const FEED_CACHE_TTL_MS = 15 * 60 * 1000;
export const FEED_FALLBACK_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FEED_ARTICLES = 20;
const MAX_SAVED_ARTICLES = 80;
const MAX_FEED_KEYS = 20;

export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem"> & {
  length?: number;
  key?: (index: number) => string | null;
};

export type FeedIdentity = { category?: Category; query?: string; page: number; country: NewsCountry };
export type SavedArticle = LiveArticle & { savedAt: string };
export type BrowserFeed = {
  savedAt: number;
  articles: LiveArticle[];
  hasNextPage: boolean;
  page: number;
  isStale: boolean;
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readJSON(storage: StorageLike, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw && raw.length < 100_000 ? JSON.parse(raw) as unknown : undefined;
  } catch {
    return undefined;
  }
}

function writeJSON(storage: StorageLike, key: string, data: unknown): boolean {
  try {
    storage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false; // private browsing / storage quota / blocked browser storage
  }
}

function safePublisherUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") &&
      !url.username && !url.password && url.hostname.includes(".") &&
      !url.hostname.endsWith(".local");
  } catch {
    return false;
  }
}

export function validateStoredArticle(value: unknown): LiveArticle | undefined {
  if (!record(value) || !safePublisherUrl(value.url)) return;
  if (typeof value.title !== "string" || !value.title || value.title.length > 240) return;
  if (typeof value.sourceName !== "string" || !value.sourceName || value.sourceName.length > 100) return;
  if (typeof value.description !== "string" || value.description.length > 280) return;
  if (typeof value.publishedAt !== "string" || !Number.isFinite(Date.parse(value.publishedAt))) return;
  if (value.category !== "Top Stories" && !CATEGORIES.some((c) => c === value.category)) return;
  return {
    id: value.url,
    url: value.url,
    title: value.title,
    description: value.description,
    sourceName: value.sourceName,
    publishedAt: new Date(value.publishedAt).toISOString(),
    category: value.category as LiveArticle["category"],
  };
}

export function feedStorageKey(filters: FeedIdentity): string {
  const query = filters.query?.trim().toLocaleLowerCase().slice(0, 100) ?? "";
  return FEED_PREFIX + encodeURIComponent(JSON.stringify([
    query ? "" : (filters.category ?? ""),
    query,
    Math.min(100, Math.max(1, Math.trunc(filters.page) || 1)),
    filters.country,
  ]));
}

/** Write only successfully retrieved headlines. Never persist provider credentials. */
export function saveFeedSnapshot(
  storage: StorageLike,
  filters: FeedIdentity,
  feed: { articles: readonly LiveArticle[]; hasNextPage: boolean; page: number },
  now = Date.now(),
): boolean {
  const articles = feed.articles.slice(0, MAX_FEED_ARTICLES)
    .map(validateStoredArticle).filter((a): a is LiveArticle => Boolean(a));
  if (!writeJSON(storage, feedStorageKey(filters), {
    version: 1, savedAt: now, articles, hasNextPage: feed.hasNextPage === true, page: feed.page,
  })) return false;

  // Opportunistic bounded retention. StorageLike supports missing key()/length
  // so read/write tests and browser environments without enumeration still work.
  if (typeof storage.length === "number" && storage.key && storage.length > MAX_FEED_KEYS) {
    try {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key?.startsWith(FEED_PREFIX)) keys.push(key);
      }
      const sorted = keys.map((key) => {
        const item = readJSON(storage, key);
        return { key, at: record(item) && typeof item.savedAt === "number" ? item.savedAt : 0 };
      }).sort((a, b) => b.at - a.at);
      for (const old of sorted.slice(MAX_FEED_KEYS)) storage.removeItem(old.key);
    } catch {
      // A failed cleanup must not block saving the current page.
    }
  }
  // A small browser-local revision marker lets discovery pages update across tabs.
  // If updating this marker fails, the cache itself is still usable.
  writeJSON(storage, FEED_INDEX_KEY, { updatedAt: now });
  return true;
}

export function readFeedSnapshot(
  storage: StorageLike,
  filters: FeedIdentity,
  now = Date.now(),
): BrowserFeed | undefined {
  const data = readJSON(storage, feedStorageKey(filters));
  if (!record(data) || data.version !== 1 ||
      typeof data.savedAt !== "number" || !Number.isFinite(data.savedAt) ||
      data.savedAt > now + 60_000 || data.savedAt < now - FEED_FALLBACK_MAX_AGE_MS ||
      !Array.isArray(data.articles) || data.articles.length > MAX_FEED_ARTICLES ||
      typeof data.hasNextPage !== "boolean" || data.page !== filters.page) return;
  const articles = data.articles.map(validateStoredArticle);
  if (articles.some((a) => !a)) return;
  return {
    savedAt: data.savedAt,
    articles: articles as LiveArticle[],
    hasNextPage: data.hasNextPage,
    page: filters.page,
    isStale: now - data.savedAt > FEED_CACHE_TTL_MS,
  };
}

export function readSavedArticles(storage: StorageLike): SavedArticle[] {
  const data = readJSON(storage, SAVED_KEY);
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  return data.slice(0, MAX_SAVED_ARTICLES).flatMap((value): SavedArticle[] => {
    const a = validateStoredArticle(value);
    if (!a || !record(value) || typeof value.savedAt !== "string" ||
        !Number.isFinite(Date.parse(value.savedAt)) || seen.has(a.url)) return [];
    seen.add(a.url);
    return [{ ...a, savedAt: value.savedAt }];
  });
}

export function toggleSavedArticle(storage: StorageLike, article: LiveArticle, now = Date.now()): boolean {
  const valid = validateStoredArticle(article);
  if (!valid) return false;
  const current = readSavedArticles(storage);
  const exists = current.some((saved) => saved.url === valid.url);
  const next = exists ? current.filter((saved) => saved.url !== valid.url) :
    [{ ...valid, savedAt: new Date(now).toISOString() }, ...current].slice(0, MAX_SAVED_ARTICLES);
  return writeJSON(storage, SAVED_KEY, next);
}

export function readPreferredTopics(storage: StorageLike): Category[] {
  const value = readJSON(storage, TOPICS_KEY);
  if (!Array.isArray(value)) return [];
  return CATEGORIES.filter((category) => value.includes(category));
}

export function savePreferredTopics(storage: StorageLike, topics: readonly Category[]): boolean {
  return writeJSON(storage, TOPICS_KEY, CATEGORIES.filter((category) => topics.includes(category)));
}
