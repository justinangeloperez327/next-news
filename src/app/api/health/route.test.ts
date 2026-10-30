import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route.ts";

test("health endpoint never leaks environment credentials or probes upstream", async () => {
  const originalKey = process.env.GNEWS_API_KEY;
  const originalRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const originalRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  try {
    process.env.GNEWS_API_KEY = "secret-key";
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io/";
    process.env.UPSTASH_REDIS_REST_TOKEN = "secret-token";
    const response = GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const body = await response.text();
    assert.deepEqual(JSON.parse(body), { status: "ok", feedMode: "configured", sharedBudget: "enabled" });
    assert.ok(!body.includes("secret-key"));
    assert.ok(!body.includes("secret-token"));
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    const invalid = GET();
    assert.equal(invalid.status, 503);
    assert.equal((await invalid.json()).status, "configuration-error");
  } finally {
    if (originalKey === undefined) delete process.env.GNEWS_API_KEY; else process.env.GNEWS_API_KEY = originalKey;
    if (originalRedisUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL; else process.env.UPSTASH_REDIS_REST_URL = originalRedisUrl;
    if (originalRedisToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN; else process.env.UPSTASH_REDIS_REST_TOKEN = originalRedisToken;
  }
});
