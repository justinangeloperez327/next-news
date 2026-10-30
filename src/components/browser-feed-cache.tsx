"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { LiveFeedResult } from "@/lib/live-news";
import type { FeedIdentity } from "@/lib/browser-storage";
import { feedStorageKey, readFeedSnapshot, saveFeedSnapshot } from "@/lib/browser-storage";
import { useStoredText, notifyStorageChanged } from "@/lib/browser-events";
import { LiveArticleCard } from "@/components/live-article-card";

export function BrowserFeedCache({ feed, filters }: { feed: LiveFeedResult; filters: FeedIdentity }) {
  const key = feedStorageKey(filters);
  const raw = useStoredText(key);

  useEffect(() => {
    if (feed.status !== "live") return;
    try {
      if (saveFeedSnapshot(window.localStorage, filters, feed)) notifyStorageChanged();
    } catch {
      // Storage can be disabled by browser policies.
    }
  }, [feed, filters]);

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
