import assert from "node:assert/strict";
import test from "node:test";
import { CATEGORIES, STORIES, getStories, getStory, parseCategory } from "./news.ts";

test("demo stories have unique slugs and valid categories", () => {
  const slugs = STORIES.map((story) => story.slug);
  assert.equal(new Set(slugs).size, slugs.length);
  for (const story of STORIES) {
    assert.ok(CATEGORIES.includes(story.category));
    assert.ok(story.body.length > 0);
  }
});

test("finds stories by slug", () => {
  assert.equal(getStory(STORIES[0].slug)?.title, STORIES[0].title);
  assert.equal(getStory("missing"), undefined);
});

test("filters by category and query", () => {
  assert.ok(getStories({ category: "Science" }).every((story) => story.category === "Science"));
  assert.ok(getStories({ query: "SOURCE" }).some((story) => story.category === "Technology"));
  assert.deepEqual(getStories({ query: "not-a-real-search-phrase-123" }), []);
  assert.equal(getStories({ query: "  " }).length, STORIES.length);
});

test("parses categories case insensitively", () => {
  assert.equal(parseCategory("technology"), "Technology");
  assert.equal(parseCategory("TECHNOLOGY"), "Technology");
  assert.equal(parseCategory("anything"), undefined);
});
