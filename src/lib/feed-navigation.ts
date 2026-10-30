import type { Category } from "./news.ts";

export const MAX_FEED_PAGE = 100;

export function parseFeedPage(value: string | string[] | undefined): number {
  const raw = typeof value === "string" ? value : value?.[0];
  if (!raw || !/^[1-9][0-9]*$/.test(raw) || raw.length > 3) return 1;
  const number = Number(raw);
  return Number.isSafeInteger(number) && number <= MAX_FEED_PAGE ? number : 1;
}

/** Keep pagination links limited to the active filter, never a supplied URL. */
export function feedHref(options: { category?: Category; query?: string; page?: number }): string {
  const params = new URLSearchParams();
  const query = options.query?.trim().slice(0, 100);
  if (query) params.set("q", query);
  else if (options.category) params.set("category", options.category.toLowerCase());
  if (options.page && options.page > 1 && options.page <= MAX_FEED_PAGE) {
    params.set("page", String(options.page));
  }
  const suffix = params.toString();
  return suffix ? "/?" + suffix + "#stories" : "/#stories";
}
