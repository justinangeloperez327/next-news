import type { Metadata } from "next";
import { SavedArticlesList } from "@/components/saved-articles-list";

export const metadata: Metadata = {
  title: "Saved articles",
  description: "Articles saved in this browser on Next News.",
};

export default function SavedPage() {
  return (
    <section className="shell saved-page">
      <span className="section-overline">Your personal reading list</span>
      <h1>Saved articles</h1>
      <p>Publisher-linked headlines saved on this device. Your list is not synced to an account and may disappear if browser storage is cleared.</p>
      <SavedArticlesList />
    </section>
  );
}
