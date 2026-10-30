import test from "node:test";
import assert from "node:assert/strict";
import { decodeFeedKey, readLocalDiscoveries } from "./local-discovery.ts";
import { feedStorageKey, saveFeedSnapshot } from "./browser-storage.ts";
import type { LiveArticle } from "./live-news.ts";

class FakeStorage {
  values = new Map<string, string>();
  get length() { return this.values.size; }
  key(i: number) { return [...this.values.keys()][i] ?? null; }
  getItem(k: string) { return this.values.get(k) ?? null; }
  setItem(k: string,v: string) { this.values.set(k,v); }
  removeItem(k: string) { this.values.delete(k); }
}
const base: LiveArticle = {
  id: "https://news.example/a", url: "https://news.example/a",
  title: "Original reporting", description: "A short excerpt",
  sourceName: "Example Press", publishedAt: "2026-10-29T14:00:00.000Z",
  category: "Technology",
};
const filters = { category: "Technology" as const, country: "" as const, page: 1 };
const now = Date.UTC(2026,9,30,11,0,0);

test("only strict feed keys can be decoded", () => {
  assert.equal(decodeFeedKey(feedStorageKey(filters))?.category, filters.category);
  assert.equal(decodeFeedKey(feedStorageKey(filters))?.page, filters.page);
  assert.equal(decodeFeedKey(feedStorageKey(filters))?.country, filters.country);
  assert.equal(decodeFeedKey("next-news:v1:feed:broken%"), undefined);
  assert.equal(decodeFeedKey("some-other-key"), undefined);
  assert.equal(decodeFeedKey("next-news:v1:feed:" + encodeURIComponent(JSON.stringify(["bad","",1,""]))), undefined);
});

test("personalized discovery reads, deduplicates and filters local snapshots", () => {
  const storage = new FakeStorage();
  const world = { ...filters, category: "World" as const };
  const science = { ...filters, category: "Science" as const };
  saveFeedSnapshot(storage, filters, { articles: [base], hasNextPage: false, page: 1 }, now);
  saveFeedSnapshot(storage, world, { articles: [base], hasNextPage: false, page: 1 }, now + 1_000);
  saveFeedSnapshot(storage, science, { articles: [{ ...base, category: "Science", url: "https://news.example/b", id: "https://news.example/b", title: "Science story" }], hasNextPage: false, page: 1 }, now);
  assert.equal(readLocalDiscoveries(storage, [], now + 2_000).length, 2);
  assert.deepEqual(readLocalDiscoveries(storage, ["Technology"], now + 2_000).map((x) => x.article.title), ["Original reporting"]);
  assert.deepEqual(readLocalDiscoveries(storage, ["Business"], now + 2_000), []);
  assert.equal(readLocalDiscoveries(storage, [], now + 25 * 60 * 60 * 1_000).length, 0);
});

test("untrusted URLs and unreadable storage cannot be shown", () => {
  const storage = new FakeStorage();
  saveFeedSnapshot(storage, filters, { articles: [base], hasNextPage: false, page: 1 }, now);
  const key = feedStorageKey(filters);
  const raw = JSON.parse(storage.getItem(key)!);
  raw.articles[0].url = "javascript:alert(1)";
  storage.setItem(key, JSON.stringify(raw));
  assert.deepEqual(readLocalDiscoveries(storage, [], now), []);
  assert.deepEqual(readLocalDiscoveries({getItem:()=>null,setItem:()=>{},removeItem:()=>{}}), []);
});
