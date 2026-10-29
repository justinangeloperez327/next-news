import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { STORIES, getStory } from "@/lib/news";

type StoryPageProps = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return STORIES.map((story) => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: StoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const story = getStory(slug);

  return {
    title: story?.title ?? "Story not found",
    description: story?.excerpt,
  };
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { slug } = await params;
  const story = getStory(slug);
  if (!story) notFound();

  return (
    <article className="shell article-layout">
      <div className="article-breadcrumb"><Link href="/">Home</Link><span aria-hidden="true">/</span><Link href={`/?category=${story.category.toLowerCase()}`}>{story.category}</Link><span aria-hidden="true">/</span><span>Story</span></div>
      <header className="article-header">
        <span className="section-overline">{story.category} / Perspective</span>
        <h1>{story.title}</h1>
        <p>{story.excerpt}</p>
        <div className="article-byline"><span className="status-dot" /> Next News editorial demo <span className="byline-divider">·</span> {story.readingMinutes} min read</div>
      </header>
      <div className={`article-visual art--${story.tone}`} aria-hidden="true"><span className="article-visual__label">NEXT / PERSPECTIVES</span><span className="article-visual__shape"/></div>
      <div className="article-content">
        <aside className="article-aside"><span className="section-overline">About this edition</span><p>This is an original demonstration article. Live news ingestion is not connected.</p></aside>
        <div className="article-prose">
          {story.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
          <div className="article-end"><span>End of article</span><Link href="/">Back to all stories <span aria-hidden="true">↗</span></Link></div>
        </div>
      </div>
    </article>
  );
}
