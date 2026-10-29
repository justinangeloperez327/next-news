import assert from "node:assert/strict";
import test from "node:test";
import { canonicalUrl, FEED_REVALIDATE_SECONDS, getLiveFeed, normalizeArticles } from "./live-news.ts";

const article = (overrides: Record<string, unknown> = {}) => ({
  title: "A verified sample headline",
  description: "A brief introduction.",
  url: "https://publisher.example/news/123?utm_source=test",
  publishedAt: "2026-10-28T10:00:00Z",
  source: { name: "Example Publisher" },
  ...overrides,
});

test("removes URL tracking and rejects unsafe schemes and credentials", () => {
  assert.equal(canonicalUrl("https://EXAMPLE.com/item/?utm_source=a&fbclid=9&story=123#part"), "https://example.com/item?story=123");
  assert.equal(canonicalUrl("javascript:alert(1)"), undefined);
  assert.equal(canonicalUrl("https://user:password@example.com/"), undefined);
  assert.equal(canonicalUrl("not a URL"), undefined);
});

test("normalizes, deduplicates, sorts and drops invalid headlines", () => {
  const news = normalizeArticles({ articles: [
    article(),
    article({ url: "https://publisher.example/news/123?utm_medium=email" }),
    article({ url: "https://publisher.example/news/456", title: "A verified sample headline" }),
    article({ title: "A newer story", url: "https://publisher.example/news/new", publishedAt: "2026-10-29T10:00:00Z" }),
    article({ url: "javascript:alert(1)" }),
    article({ title: "" }),
    article({ publishedAt: "not-a-date" }),
  ] }, "Technology");

  assert.equal(news.length, 2);
  assert.equal(news[0].title, "A newer story");
  assert.equal(news[1].url, "https://publisher.example/news/123");
  assert.equal(news[1].sourceName, "Example Publisher");
  assert.equal(news[1].category, "Technology");
});

test("rejects malformed top-level responses", () => {
  assert.throws(() => normalizeArticles({}, "World"), /Invalid news feed payload/);
  assert.throws(() => normalizeArticles(null, "World"), /Invalid news feed payload/);
});

test("does not call a provider without a server-side key", async () => {
  const result = await getLiveFeed({}, {
    apiKey: "",
    fetcher: (() => { throw new Error("Should not fetch"); }) as typeof fetch,
  });
  assert.deepEqual(result, { status: "demo" });
});

test("uses top-headlines category and secret header, with a ten-minute cache", async () => {
  let calls = 0;
  const result = await getLiveFeed({ category: "Technology" }, {
    apiKey: "test-secret",
    fetcher: (async (input: URL | RequestInfo, init?: RequestInit & { next?: { revalidate: number } }) => {
      calls++;
      const url = new URL(String(input));
      assert.equal(url.pathname, "/api/v4/top-headlines");
      assert.equal(url.searchParams.get("category"), "technology");
      assert.equal(url.searchParams.get("lang"), "en");
      assert.ok(!url.toString().includes("test-secret"));
      assert.equal((init?.headers as Record<string, string>)["X-Api-Key"], "test-secret");
      assert.equal(init?.next?.revalidate, FEED_REVALIDATE_SECONDS);
      return new Response(JSON.stringify({ articles: [article()] }), { status: 200 });
    }) as typeof fetch,
  });
  assert.equal(calls, 1);
  assert.equal(result.status, "live");
  if (result.status === "live") assert.equal(result.articles.length, 1);
});

test("uses search for climate, and global search supersedes category", async () => {
  const urls: URL[] = [];
  const fetcher = (async (input: URL | RequestInfo) => {
    urls.push(new URL(String(input)));
    return new Response(JSON.stringify({ articles: [] }), { status: 200 });
  }) as typeof fetch;

  await getLiveFeed({ category: "Climate" }, { apiKey: "key", fetcher });
  await getLiveFeed({ category: "World", query: "  energy policy  " }, { apiKey: "key", fetcher });

  assert.equal(urls[0].pathname, "/api/v4/search");
  assert.equal(urls[0].searchParams.get("q"), "climate");
  assert.equal(urls[1].searchParams.get("q"), "energy policy");
});

test("provider failure is explicitly unavailable, not fake live news", async () => {
  const serverError = await getLiveFeed({}, {
    apiKey: "key",
    fetcher: (async () => new Response("rate limited", { status: 429 })) as typeof fetch,
  });
  assert.deepEqual(serverError, { status: "unavailable" });

  const malformed = await getLiveFeed({}, {
    apiKey: "key",
    fetcher: (async () => new Response("{}", { status: 200 })) as typeof fetch,
  });
  assert.deepEqual(malformed, { status: "unavailable" });

  const timeout = await getLiveFeed({}, {
    apiKey: "key",
    fetcher: (async () => { throw new Error("network unavailable"); }) as typeof fetch,
  });
  assert.deepEqual(timeout, { status: "unavailable" });
});
