import { test, expect } from "@playwright/test";

const article = {
  id: "https://publisher.example/local-story",
  title: "Previously loaded local headline",
  description: "A stored description for browser-only discovery.",
  url: "https://publisher.example/local-story",
  sourceName: "Example Publisher",
  publishedAt: new Date().toISOString(),
  category: "Technology",
};

test("homepage search and demo navigation work", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Stay curious/i })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Search stories" });
  await search.fill("science");
  await search.press("Enter");
  await expect(page.getByRole("heading", { name: /Results for “science”/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "From scientific paper to public headline" })).toBeVisible();
});

test("reading size persists across reloads without a server account", async ({ page }) => {
  await page.goto("/stories/how-to-read-the-news-with-context");
  const extra = page.getByRole("button", { name: "Extra large" });
  await extra.click();
  await expect(extra).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Extra large" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".reader-prose")).toHaveClass(/reader-prose--extra-large/);
});

test("favorite topics persist and appear as local shortcuts", async ({ page }) => {
  await page.goto("/");
  const technology = page.getByRole("button", { name: /Technology/ });
  await technology.click();
  await expect(technology).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: /Technology/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Quick links:")).toBeVisible();
  await page.getByRole("link", { name: "For You", exact: true }).click();
  await expect(page.getByRole("heading", { name: "For You" })).toBeVisible();
});

test("saved publisher articles are browser-only and removable", async ({ page }) => {
  await page.addInitScript((record) => {
    if (!location.origin.startsWith("http")) return;
    localStorage.setItem("next-news:v1:saved", JSON.stringify([
      { ...record, savedAt: new Date().toISOString() },
    ]));
  }, article);
  await page.goto("/saved");
  await expect(page.getByRole("heading", { name: "Saved articles" })).toBeVisible();
  await expect(page.getByRole("link", { name: article.title })).toBeVisible();
  await page.getByRole("button", { name: /Saved ✓/ }).click();
  await expect(page.getByRole("heading", { name: "No saved articles yet" })).toBeVisible();
});

test("For You discovers only previously cached articles matching chosen topics", async ({ page }) => {
  const feedKey = "next-news:v1:feed:" + encodeURIComponent(JSON.stringify(["Technology", "", 1, ""]));
  await page.addInitScript(({ feedKey, record }) => {
    if (!location.origin.startsWith("http")) return;
    const now = Date.now();
    localStorage.setItem(feedKey, JSON.stringify({
      version: 1, savedAt: now, articles: [record], hasNextPage: false, page: 1,
    }));
    localStorage.setItem("next-news:v1:feed-index", JSON.stringify({ updatedAt: now }));
    localStorage.setItem("next-news:v1:topics", JSON.stringify(["Technology"]));
  }, { feedKey, record: article });
  await page.goto("/for-you");
  await expect(page.getByRole("heading", { name: "For You" })).toBeVisible();
  await expect(page.getByRole("link", { name: article.title })).toBeVisible();
  // After switching to a different topic, no false "recommendations" appear.
  await page.getByRole("button", { name: /Technology/ }).click();
  await page.getByRole("button", { name: /Business/ }).click();
  await expect(page.getByRole("heading", { name: "No matching cached headlines yet" })).toBeVisible();
});

test("responsive navigation retains access to saved articles", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("navigation", { name: "News sections" }).getByRole("link", { name: "Saved" }).click();
  await expect(page).toHaveURL(/\/saved$/);
  await expect(page.getByRole("heading", { name: "Saved articles" })).toBeVisible();
});
