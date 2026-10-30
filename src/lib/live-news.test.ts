import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalUrl,
  FEED_REVALIDATE_SECONDS,
  getLiveFeed,
  isSourceAllowed,
  normalizeArticles,
  parseSourceDomains,
} from "./live-news.ts";

const article = (overrides: Record<string, unknown> = {}) => ({
  title: "A verified sample headline",
  description: "A brief introduction.",
  url: "https://publisher.example/news/123?utm_source=test",
  publishedAt: "2026-10-28T10:00:00Z",
  source: { name: "Example Publisher" },
  ...overrides,
});

test("removes URL tracking and rejects unsafe schemes, credentials and local hosts", () => {
  assert.equal(canonicalUrl("https://EXAMPLE.com/item/?utm_source=a&fbclid=9&story=123#part"), "https://example.com/item?story=123");
  assert.equal(canonicalUrl("javascript:alert(1)"), undefined);
  assert.equal(canonicalUrl("https://user:password@example.com/"), undefined);
  assert.equal(canonicalUrl("https://localhost/a"), undefined);
  assert.equal(canonicalUrl("https://intranet.local/a"), undefined);
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
    article({ publishedAt: "2099-01-01T00:00:00Z" }),
  ] }, "Technology");

  assert.equal(news.length, 2);
  assert.equal(news[0].title, "A newer story");
  assert.equal(news[1].url, "https://publisher.example/news/123");
  assert.equal(news[1].sourceName, "Example Publisher");
  assert.equal(news[1].category, "Technology");
});

test("validates domain policies without matching misleading lookalike hosts", () => {
  assert.deepEqual(parseSourceDomains("Example.com, news.example.org, https://wrong.org, , .oops"), ["example.com", "news.example.org"]);
  assert.equal(isSourceAllowed("https://news.example.com/a", { allowedDomains: ["example.com"] }), true);
  assert.equal(isSourceAllowed("https://fakeexample.com/a", { allowedDomains: ["example.com"] }), false);
  assert.equal(isSourceAllowed("https://news.example.com/a", { blockedDomains: ["example.com"] }), false);
  assert.equal(normalizeArticles({ articles: [article()] }, "World", { allowedDomains: ["other.example"] }).length, 0);
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

test("sends paged top-headlines requests with a secret header and ten-minute cache", async () => {
  let calls = 0;
  const result = await getLiveFeed({ category: "Technology", page: 2 }, {
    apiKey: "test-secret",
    fetcher: (async (input: URL | RequestInfo, init?: RequestInit & { next?: { revalidate: number } }) => {
      calls++;
      const url = new URL(String(input));
      assert.equal(url.pathname, "/api/v4/top-headlines");
      assert.equal(url.searchParams.get("category"), "technology");
      assert.equal(url.searchParams.get("page"), "2");
      assert.equal(url.searchParams.get("lang"), "en");
      assert.ok(!url.toString().includes("test-secret"));
      assert.equal((init?.headers as Record<string, string>)["X-Api-Key"], "test-secret");
      assert.equal(init?.next?.revalidate, FEED_REVALIDATE_SECONDS);
      return new Response(JSON.stringify({ totalArticles: 52, articles: [article()] }), { status: 200 });
    }) as typeof fetch,
  });
  assert.equal(calls, 1);
  assert.equal(result.status, "live");
  if (result.status === "live") {
    assert.equal(result.articles.length, 1);
    assert.equal(result.page, 2);
    assert.equal(result.hasNextPage, true);
  }
});

test("search parameters supersede category, and page is bounded", async () => {
  const urls: URL[] = [];
  const fetcher = (async (input: URL | RequestInfo) => {
    urls.push(new URL(String(input)));
    return new Response(JSON.stringify({ totalArticles: 9, articles: [article()] }), { status: 200 });
  }) as typeof fetch;

  await getLiveFeed({ category: "Climate" }, { apiKey: "key", fetcher });
  await getLiveFeed({ category: "World", query: "  energy policy  ", page: 10000 }, { apiKey: "key", fetcher });

  assert.equal(urls[0].pathname, "/api/v4/search");
  assert.equal(urls[0].searchParams.get("q"), "climate");
  assert.equal(urls[1].searchParams.get("q"), "energy policy");
  assert.equal(urls[1].searchParams.get("page"), "1");
});

test("does not claim next page when provider lacks a total count", async () => {
  const result = await getLiveFeed({ page: 1 }, {
    apiKey: "key",
    fetcher: (async () => new Response(JSON.stringify({ articles: [article()] }), { status: 200 })) as typeof fetch,
  });
  assert.equal(result.status, "live");
  if (result.status === "live") assert.equal(result.hasNextPage, false);
});

test("provider failure returns explicit reasons, not fake live news", async () => {
  for (const [status, reason] of [[401, "authorization"], [403, "quota"], [429, "throttled"], [500, "upstream"]] as const) {
    const result = await getLiveFeed({}, {
      apiKey: "key",
      fetcher: (async () => new Response("error", { status })) as typeof fetch,
    });
    assert.deepEqual(result, { status: "unavailable", reason });
  }

  const malformed = await getLiveFeed({}, {
    apiKey: "key",
    fetcher: (async () => new Response("{}", { status: 200 })) as typeof fetch,
  });
  assert.deepEqual(malformed, { status: "unavailable", reason: "invalid-data" });

  const timeout = await getLiveFeed({}, {
    apiKey: "key",
    fetcher: (async () => { throw new Error("network unavailable"); }) as typeof fetch,
  });
  assert.deepEqual(timeout, { status: "unavailable", reason: "network" });
});

test("country filter is transmitted only for supported codes and is never logged as a query", async () => {
  const urls: URL[] = [];
  const events: unknown[] = [];
  const fetcher = (async (input: URL | RequestInfo) => {
    urls.push(new URL(String(input)));
    return new Response(JSON.stringify({ totalArticles: 1, articles: [article()] }), { status: 200 });
  }) as typeof fetch;
  const observe = (event: import("./news-telemetry.ts").NewsEvent) => events.push(event);

  await getLiveFeed({ category: "World", country: "ph" }, { apiKey: "key", fetcher, observe });
  await getLiveFeed({ category: "World", country: "invalid" as "ph" }, { apiKey: "key", fetcher, observe });
  assert.equal(urls[0].searchParams.get("country"), "ph");
  assert.equal(urls[1].searchParams.get("country"), null);
  assert.equal((events[0] as { country: string }).country, "ph");
});

