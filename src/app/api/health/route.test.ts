import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "./route.ts";

test("health endpoint reports browser cache mode without exposing credentials", async () => {
  const initial = process.env.GNEWS_API_KEY;
  try {
    process.env.GNEWS_API_KEY = "secret-key";
    const response = GET();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const body = await response.text();
    assert.deepEqual(JSON.parse(body), { status: "ok", feedMode: "configured", browserCache: "localStorage" });
    assert.ok(!body.includes("secret-key"));
    delete process.env.GNEWS_API_KEY;
    assert.equal((await GET().json()).feedMode, "demo");
  } finally {
    if (initial === undefined) delete process.env.GNEWS_API_KEY;
    else process.env.GNEWS_API_KEY = initial;
  }
});
