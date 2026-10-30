import assert from "node:assert/strict";
import test from "node:test";
import {
  admitProviderRequest,
  budgetConfigFromEnv,
  budgetConfigurationState,
  limitedInteger,
} from "./request-budget.ts";

const config = { redisUrl: "https://example.upstash.io/", redisToken: "private-token", dailyLimit: 90, perSecondLimit: 1 };

test("config is optional in development and partially configured values fail closed", () => {
  assert.equal(budgetConfigurationState({ ...config, redisUrl: undefined, redisToken: undefined }), "disabled");
  assert.equal(budgetConfigurationState({ ...config, redisToken: undefined }), "invalid");
  assert.equal(budgetConfigurationState({ ...config, redisUrl: "http://localhost" }), "invalid");
  assert.equal(budgetConfigurationState(config), "enabled");
  assert.deepEqual(budgetConfigFromEnv({ NEWS_DAILY_REQUEST_BUDGET: "55", NEWS_PER_SECOND_BUDGET: "5" } as NodeJS.ProcessEnv), {
    redisUrl: undefined, redisToken: undefined, dailyLimit: 55, perSecondLimit: 5,
  });
  assert.equal(limitedInteger("-2", 90, 100), 90);
  assert.equal(limitedInteger("999", 90, 100), 90);
});

test("admission uses an atomic EVAL over shared UTC day and second counters", async () => {
  const now = Date.UTC(2026, 9, 30, 23, 59, 59);
  const decision = await admitProviderRequest(config, {
    now,
    fetcher: (async (input: URL | RequestInfo, init?: RequestInit) => {
      assert.equal(String(input), config.redisUrl);
      assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer private-token");
      assert.equal(init?.cache, "no-store");
      const payload = JSON.parse(String(init?.body));
      assert.equal(payload[0], "EVAL");
      assert.equal(payload[2], 2);
      assert.equal(payload[3], "next-news:daily:2026-10-30");
      assert.equal(payload[4], `next-news:second:${Math.floor(now / 1000)}`);
      assert.equal(payload[5], 90);
      assert.equal(payload[6], 1);
      assert.equal(payload[7], 61);
      return new Response(JSON.stringify({ result: 0 }), { status: 200 });
    }) as typeof fetch,
  });
  assert.equal(decision, "allowed");
});

test("quota denials and storage errors are explicit", async () => {
  for (const [value, expectation] of [[1, "daily-limit"], [2, "burst-limit"], [3, "unavailable"]] as const) {
    assert.equal(await admitProviderRequest(config, {
      fetcher: (async () => new Response(JSON.stringify({ result: value }), { status: 200 })) as typeof fetch,
    }), expectation);
  }
  assert.equal(await admitProviderRequest(config, {
    fetcher: (async () => new Response("failed", { status: 503 })) as typeof fetch,
  }), "unavailable");
  assert.equal(await admitProviderRequest(config, {
    fetcher: (async () => { throw new Error("redis offline"); }) as typeof fetch,
  }), "unavailable");
});
