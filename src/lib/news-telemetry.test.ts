import test from "node:test";
import assert from "node:assert/strict";
import { logNewsEvent } from "./news-telemetry.ts";

test("logs structured bounded fields, without request secrets or search terms", () => {
  const original = console.info;
  let output = "";
  console.info = (message: string) => { output = message; };
  try {
    logNewsEvent({ event: "provider_fetch", result: "success", elapsedMs: 42, category: "World", country: "ph", page: 1, articleCount: 3 });
  } finally {
    console.info = original;
  }
  assert.deepEqual(JSON.parse(output), {
    service: "next-news", event: "provider_fetch", result: "success", elapsedMs: 42,
    category: "World", country: "ph", page: 1, articleCount: 3,
  });
});
