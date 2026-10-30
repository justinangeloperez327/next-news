"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, type Category } from "@/lib/news";
import { readPreferredTopics, savePreferredTopics, TOPICS_KEY } from "@/lib/browser-storage";
import { notifyStorageChanged, useStoredText } from "@/lib/browser-events";

export function TopicPreferences() {
  const raw = useStoredText(TOPICS_KEY);
  const [storageError, setStorageError] = useState(false);
  const selected = readPreferredTopics({ getItem: () => raw, setItem: () => {}, removeItem: () => {} });

  function toggle(category: Category) {
    const next = selected.includes(category)
      ? selected.filter((item) => item !== category)
      : [...selected, category];
    try {
      const ok = savePreferredTopics(window.localStorage, next);
      setStorageError(!ok);
      if (ok) notifyStorageChanged();
    } catch {
      setStorageError(true);
    }
  }

  return (
    <section className="shell topic-preferences" aria-labelledby="topic-preferences-heading">
      <div>
        <span className="section-overline">A reading experience for you</span>
        <h2 id="topic-preferences-heading">Your favorite topics</h2>
        <p>Choose categories for quick access. Your selections stay in this browser only.</p>
      </div>
      <div className="topic-preferences__right">
        <div className="topic-choices">
          {CATEGORIES.map((category) => (
            <button
              type="button"
              key={category}
              aria-pressed={selected.includes(category)}
              className={`topic-choice ${selected.includes(category) ? "topic-choice--on" : ""}`}
              onClick={() => toggle(category)}
            >{selected.includes(category) ? "✓ " : "+ "}{category}</button>
          ))}
        </div>
        {storageError && <p role="status" className="save-error">Browser storage is unavailable; preferences cannot be saved.</p>}
        {selected.length > 0 &&
          <div className="topic-links">
            <span>Quick links:</span>
            {selected.map((category) => <Link key={category} href={`/?category=${category.toLowerCase()}`}>{category} ↗</Link>)}
          </div>}
      </div>
    </section>
  );
}
