"use client";

import { useState } from "react";
import type { LiveArticle } from "@/lib/live-news";
import { readSavedArticles, SAVED_KEY, toggleSavedArticle } from "@/lib/browser-storage";
import { notifyStorageChanged, useStoredText } from "@/lib/browser-events";

export function SaveArticleButton({ article }: { article: LiveArticle }) {
  const stored = useStoredText(SAVED_KEY);
  const [error, setError] = useState(false);
  const saved = stored !== null && readSavedArticles({
    getItem: () => stored,
    setItem: () => {},
    removeItem: () => {},
  }).some((item) => item.url === article.url);

  function toggle() {
    try {
      const ok = toggleSavedArticle(window.localStorage, article);
      setError(!ok);
      if (ok) notifyStorageChanged();
    } catch {
      setError(true);
    }
  }
  return (
    <span className="save-control">
      <button type="button" className={`save-button ${saved ? "save-button--active" : ""}`} onClick={toggle} aria-pressed={saved}>
        {saved ? "Saved ✓" : "Save article"}
      </button>
      {error && <span className="save-error" role="status">Browser storage unavailable</span>}
    </span>
  );
}
