import test from "node:test";
import assert from "node:assert/strict";
import {
  feedStorageKey, saveFeedSnapshot, readFeedSnapshot, toggleSavedArticle,
  readSavedArticles, readPreferredTopics, savePreferredTopics, FEED_CACHE_TTL_MS,
  FEED_FALLBACK_MAX_AGE_MS,
} from "./browser-storage.ts";
import type { LiveArticle } from "./live-news.ts";

const example: LiveArticle = {
  id: "https://publisher.example/story",
  title: "Example headline",
  description: "A short summary",
  url: "https://publisher.example/story",
  sourceName: "Example Publisher",
  publishedAt: "2026-10-29T00:00:00.000Z",
  category: "World",
};
class MemoryStorage {
  data = new Map<string, string>();
  get length() { return this.data.size; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

const filters = { category: "World" as const, country: "ph" as const, page: 1 };

test("feed keys include filters and search is normalized", () => {
  assert.notEqual(feedStorageKey(filters), feedStorageKey({ ...filters, country: "jp" }));
  assert.equal(feedStorageKey({ ...filters, query: "  AI " }), feedStorageKey({ ...filters, category: undefined, query: "ai" }));
  assert.notEqual(feedStorageKey(filters), feedStorageKey({ ...filters, page: 2 }));
});

test("feed snapshots validate content and enforce TTL and maximum age", () => {
  const storage = new MemoryStorage();
  const now = 1_792_000_000_000;
  assert.equal(saveFeedSnapshot(storage, filters, { articles: [example], page: 1, hasNextPage: true }, now), true);
  assert.equal(readFeedSnapshot(storage, filters, now)?.isStale, false);
  assert.equal(readFeedSnapshot(storage, filters, now + FEED_CACHE_TTL_MS + 1)?.isStale, true);
  assert.equal(readFeedSnapshot(storage, filters, now + FEED_FALLBACK_MAX_AGE_MS + 1), undefined);
  storage.setItem(feedStorageKey(filters), "{corrupted");
  assert.equal(readFeedSnapshot(storage, filters, now), undefined);
  storage.setItem(feedStorageKey(filters), JSON.stringify({ version: 1, savedAt: now, page: 1, hasNextPage: false, articles: [{ ...example, url: "javascript:alert(1)" }] }));
  assert.equal(readFeedSnapshot(storage, filters, now), undefined);
});

test("only safe article metadata is saved, with idempotent toggles", () => {
  const storage = new MemoryStorage();
  assert.equal(toggleSavedArticle(storage, example), true);
  assert.deepEqual(readSavedArticles(storage).map((a) => a.title), ["Example headline"]);
  assert.equal(toggleSavedArticle(storage, example), true);
  assert.deepEqual(readSavedArticles(storage), []);
  assert.equal(toggleSavedArticle(storage, { ...example, url: "javascript:bad()" }), false);
  storage.setItem("next-news:v1:saved", "malformed");
  assert.deepEqual(readSavedArticles(storage), []);
});

test("topic choices are validated against supported categories", () => {
  const storage = new MemoryStorage();
  assert.equal(savePreferredTopics(storage, ["Business", "World"]), true);
  assert.deepEqual(readPreferredTopics(storage), ["World", "Business"]);
  storage.setItem("next-news:v1:topics", '["World","Unknown","World"]');
  assert.deepEqual(readPreferredTopics(storage), ["World"]);
});

test("blocked browser storage is handled without throwing", () => {
  const blocked = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
    removeItem() { throw new Error("blocked"); },
  };
  assert.equal(readFeedSnapshot(blocked, filters), undefined);
  assert.deepEqual(readSavedArticles(blocked), []);
  assert.deepEqual(readPreferredTopics(blocked), []);
  assert.equal(toggleSavedArticle(blocked, example), false);
  assert.equal(savePreferredTopics(blocked, ["World"]), false);
  assert.equal(saveFeedSnapshot(blocked, filters, { articles: [example], hasNextPage: false, page: 1 }), false);
});
