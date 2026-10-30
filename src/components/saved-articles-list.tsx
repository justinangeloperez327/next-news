"use client";

import Link from "next/link";
import { readSavedArticles, SAVED_KEY } from "@/lib/browser-storage";
import { useStoredText } from "@/lib/browser-events";
import { LiveArticleCard } from "@/components/live-article-card";

export function SavedArticlesList() {
  const raw = useStoredText(SAVED_KEY);
  const saved = readSavedArticles({ getItem: () => raw, setItem: () => {}, removeItem: () => {} });
  return saved.length ? (
    <>
      <p className="saved-page__detail">{saved.length} {saved.length === 1 ? "article" : "articles"} saved in this browser.</p>
      <div className="story-grid">
        {saved.map((article, index) => <LiveArticleCard key={article.url} article={article} index={index} />)}
      </div>
    </>
  ) : (
    <div className="empty-state">
      <h2>No saved articles yet</h2>
      <p>Use the Save article control on any publisher-linked headline. Your reading list is stored only in this browser.</p>
      <Link href="/" className="text-link">Explore news <span aria-hidden="true">↗</span></Link>
    </div>
  );
}
