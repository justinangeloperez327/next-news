import Link from "next/link";
import type { Story } from "@/lib/news";

export function StoryCard({ story, index }: { story: Story; index: number }) {
  return (
    <article className="story-card">
      <Link href={`/stories/${story.slug}`} className={`story-illustration art--${story.tone}`} aria-label={`Read: ${story.title}`}>
        <span className="illustration-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <span className="illustration-shape" aria-hidden="true" />
        <span className="illustration-line" aria-hidden="true" />
      </Link>
      <div className="card-meta"><span>{story.category}</span><span>{story.readingMinutes} min read</span></div>
      <h3><Link href={`/stories/${story.slug}`}>{story.title}</Link></h3>
      <p>{story.excerpt}</p>
      <Link className="text-link" href={`/stories/${story.slug}`}>Read the story <span aria-hidden="true">↗</span></Link>
    </article>
  );
}
