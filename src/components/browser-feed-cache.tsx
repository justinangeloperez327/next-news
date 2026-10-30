"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { LiveFeedResult } from "@/lib/live-news";
import type { FeedIdentity } from "@/lib/browser-storage";
import { feedStorageKey, readFeedSnapshot, saveFeedSnapshot } from "@/lib/browser-storage";
import { useStoredText, notifyStorageChanged } from "@/lib/browser-events";
import { LiveArticleCard } from "@/components/live-article-card";

export function BrowserFeedCache({ feed, filters }: { feed: LiveFeedResult; filters: FeedIdentity }) {
  const { category, query, page, country } = filters;
  const key = feedStorageKey({ category, query, page, country });
  const raw = useStoredText(key);

  useEffect(() => {
    if (feed.status !== "live") return;
    try {
      const identity = { category, query, page, country };
      const previous = readFeedSnapshot(window.localStorage, identity);
      // Do not write again when a rerender is caused by our own storage event.
      if (previous && !previous.isStale &&
          previous.hasNextPage === feed.hasNextPage &&
          previous.articles.length === feed.articles.length &&
          previous.articles.every((article, i) =>
            article.url === feed.articles[i].url &&
            article.title === feed.articles[i].title)) return;
      if (saveFeedSnapshot(window.localStorage, identity, feed)) notifyStorageChanged();
    } catch {
      // Storage can be disabled by browser policies.
    }
  }, [feed, category, query, page, country]);

  if (feed.status !== "unavailable" || !raw) return null;
  const storage = { getItem: () => raw, setItem: () => {}, removeItem: () => {} };
  const cached = readFeedSnapshot(storage, filters);
  if (!cached || cached.articles.length === 0) return null;

  const savedAt = new Intl.DateTimeFormat("en", {
    dateStyle: "medium", timeStyle: "short", timeZone: "UTC",
  }).format(new Date(cached.savedAt));

  return (
    <section className="shell browser-cache" aria-label="Previously cached news articles">
      <div className="browser-cache__heading">
        <div><span className="section-overline">From your browser storage</span><h2>Previously loaded headlines</h2></div>
        <Link href="/saved" className="text-link">Saved articles <span aria-hidden="true">↗</span></Link>
      </div>
      <p className="browser-cache__notice">
        Cached {savedAt} UTC. {cached.isStale ? "This copy is older than 15 minutes." : "This copy was saved recently."}
        {" "}These are not live updates; the news provider is currently unavailable.
      </p>
      <div className="story-grid">
        {cached.articles.map((article, index) => <LiveArticleCard key={article.id} article={article} index={index} />)}
      </div>
    </section>
  );
}
