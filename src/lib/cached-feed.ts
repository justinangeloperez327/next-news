import "server-only";
import { unstable_cache } from "next/cache";
import { getLiveFeed, FEED_REVALIDATE_SECONDS } from "./live-news";
import type { Category } from "./news";
import type { NewsCountry } from "./regions";

/**
 * Cache provider responses by normalized category, search, page and country.
 * Quota admission/telemetry occur on a cache miss, not on every page view.
 * The application does not enable Next.js Cache Components, so unstable_cache
 * remains supported here; review when migrating to the use-cache model.
 */
export const getCachedFeed = unstable_cache(
  async (category?: Category, query?: string, page = 1, country: NewsCountry = "") =>
    getLiveFeed({ category, query, page, country }),
  ["next-news-feed-v3"],
  { revalidate: FEED_REVALIDATE_SECONDS },
);
