import assert from "node:assert/strict";
import test from "node:test";
import { feedHref, MAX_FEED_PAGE, parseFeedPage } from "./feed-navigation.ts";

test("pagination only accepts safe positive integer page values", () => {
  assert.equal(parseFeedPage("2"), 2);
  assert.equal(parseFeedPage("100"), MAX_FEED_PAGE);
  for (const value of [undefined, "0", "-1", "1.2", "02", "Infinity", "101", "999999", "NaN", " 4", "1&x=1"]) {
    assert.equal(parseFeedPage(value), 1);
  }
});

test("pagination links preserve search and do not mix it with categories", () => {
  assert.equal(feedHref({ category: "World", page: 2 }), "/?category=world&page=2#stories");
  assert.equal(feedHref({ category: "Technology", query: "AI & chips", page: 3 }), "/?q=AI+%26+chips&page=3#stories");
  assert.equal(feedHref({ page: 1 }), "/#stories");
  assert.equal(feedHref({ category: "Climate" }), "/?category=climate#stories");
});
