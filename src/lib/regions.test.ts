import test from "node:test";
import assert from "node:assert/strict";
import { NEWS_REGIONS, parseNewsCountry } from "./regions.ts";

test("supported country codes remain unique and default to worldwide", () => {
  assert.equal(new Set(NEWS_REGIONS.map((r) => r.code)).size, NEWS_REGIONS.length);
  assert.equal(parseNewsCountry("ph"), "ph");
  assert.equal(parseNewsCountry("GB"), "gb");
  assert.equal(parseNewsCountry("ae"), "");
  assert.equal(parseNewsCountry("https://example.com"), "");
  assert.equal(parseNewsCountry(undefined), "");
});
