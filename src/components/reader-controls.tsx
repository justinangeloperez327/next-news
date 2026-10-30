"use client";

import { useState } from "react";
import { notifyStorageChanged, useStoredText } from "@/lib/browser-events";
import { parseReadingSize, READING_PREF_KEY, READING_SIZES, saveReadingSize } from "@/lib/reading-preferences";

const labels = { standard: "Standard", large: "Large", "extra-large": "Extra large" };

export function ReaderControls({ paragraphs }: { paragraphs: readonly string[] }) {
  const size = parseReadingSize(useStoredText(READING_PREF_KEY));
  const [error, setError] = useState(false);

  function choose(next: typeof size) {
    try {
      const saved = saveReadingSize(window.localStorage, next);
      setError(!saved);
      if (saved) notifyStorageChanged();
    } catch {
      setError(true);
    }
  }

  return (
    <section className="reader-container" aria-label="Reading appearance">
      <div className="reader-controls">
        <span>Text size</span>
        <div className="reader-controls__options" role="group" aria-label="Article text size">
          {READING_SIZES.map((option) => (
            <button
              type="button"
              className={size === option ? "reader-choice reader-choice--active" : "reader-choice"}
              key={option}
              aria-pressed={size === option}
              onClick={() => choose(option)}
            >{labels[option]}</button>
          ))}
        </div>
        {error && <span className="save-error" role="status">Your browser could not save this preference.</span>}
      </div>
      <div className={`article-prose reader-prose reader-prose--${size}`}>
        {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
      </div>
    </section>
  );
}
