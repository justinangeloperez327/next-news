"use client";

import Link from "next/link";
import { useBrowserReady, useStoredText } from "@/lib/browser-events";
import { FEED_INDEX_KEY, readPreferredTopics, TOPICS_KEY } from "@/lib/browser-storage";
import { readLocalDiscoveries } from "@/lib/local-discovery";
import { LiveArticleCard } from "@/components/live-article-card";

export function ForYouList() {
  const browserReady = useBrowserReady();
  // Subscribe to both values, so updates in another tab appear automatically.
  const index = useStoredText(FEED_INDEX_KEY);
  const topicText = useStoredText(TOPICS_KEY);

  if (!browserReady) {
    return <p className="local-discovery-hint">Loading articles stored in this browser…</p>;
  }

  // Explicit read only on the client after hydration. The subscriptions above
  // cause rerenders when a feed snapshot or preference changes.
  void index;
  let recommendations: ReturnType<typeof readLocalDiscoveries> = [];
  let selected: ReturnType<typeof readPreferredTopics> = [];
  try {
    selected = readPreferredTopics({
      getItem: () => topicText, setItem: () => {}, removeItem: () => {},
    });
    recommendations = readLocalDiscoveries(window.localStorage, selected);
  } catch {
    // Browser profile restrictions should not crash the reading experience.
  }

  return (
    <>
      <p className="local-discovery-hint">
        {selected.length > 0
          ? `Showing previously visited headlines in: ${selected.join(", ")}.`
          : "Showing headlines from sections you've visited."}
        {" "}These articles are stored locally, may be outdated, and are not a live news feed.
      </p>
      {recommendations.length > 0 ? (
        <div className="story-grid">
          {recommendations.map(({ article }, index) => (
            <LiveArticleCard key={article.url} article={article} index={index} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No matching cached headlines yet</h2>
          <p>Visit a category or search live news to build your local reading collection. If you selected topics, only those categories appear here.</p>
          <Link href="/" className="text-link">Explore headlines <span aria-hidden="true">↗</span></Link>
        </div>
      )}
    </>
  );
}
