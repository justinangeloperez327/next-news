import Link from "next/link";
import { StoryCard } from "@/components/story-card";
import { getStories, parseCategory } from "@/lib/news";

type HomeProps = {
  searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>;
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : value?.[0];
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const category = parseCategory(firstValue(params.category));
  const query = firstValue(params.q)?.trim() ?? "";
  const stories = getStories({ category, query });
  const isBrowsing = Boolean(category || query);
  const feature = !isBrowsing ? stories[0] : undefined;
  const visibleStories = feature ? stories.filter((story) => story.slug !== feature.slug) : stories;

  return (
    <>
      <section className="shell intro">
        <div className="eyebrow"><span className="eyebrow-line" /> The Next News Journal <span className="eyebrow-line" /></div>
        <h1>Stay curious.<br /><em>See the bigger picture.</em></h1>
        <p>Ideas, perspectives, and explainers worth your attention — presented with clarity, not clutter.</p>
        <div className="intro-note"><span className="status-dot" /> Preview experience: articles below are original demos, not current headlines.</div>
      </section>
      {feature && (
        <section className="shell featured-section" aria-labelledby="featured-heading">
          <div className="section-heading"><div><span className="section-overline">In focus</span><h2 id="featured-heading">The featured read</h2></div><span className="section-counter">01 / Featured</span></div>
          <div className="feature-card">
            <Link href={`/stories/${feature.slug}`} className="feature-visual" aria-label={`Read: ${feature.title}`}>
              <span className="feature-visual__label">PERSPECTIVE / 001</span>
              <div className="feature-orbit" aria-hidden="true"><div className="feature-orbit__core"/></div>
              <span className="feature-visual__corner" aria-hidden="true">N° 01</span>
            </Link>
            <div className="feature-copy">
              <span className="feature-category">{feature.category} / Editor's pick</span>
              <h3><Link href={`/stories/${feature.slug}`}>{feature.title}</Link></h3>
              <p>{feature.excerpt}</p>
              <div className="feature-bottom"><span>{feature.readingMinutes} min read</span><Link href={`/stories/${feature.slug}`} className="feature-button">Explore this story <span aria-hidden="true">↗</span></Link></div>
            </div>
          </div>
        </section>
      )}
      <section className="shell stories-section" id="stories" aria-labelledby="stories-heading">
        <div className="section-heading">
          <div>
            <span className="section-overline">{isBrowsing ? "Browse the collection" : "Thoughtful reads"}</span>
            <h2 id="stories-heading">{query ? `Results for “${query}”` : category ? `${category} stories` : "Explore the stories"}</h2>
          </div>
          <span className="section-counter">{visibleStories.length} {visibleStories.length === 1 ? "story" : "stories"}</span>
        </div>
        {visibleStories.length > 0 ? (
          <div className="story-grid">
            {visibleStories.map((story, index) => <StoryCard key={story.slug} story={story} index={index} />)}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No stories match your search.</h3>
            <p>Try another keyword or explore every section.</p>
            <Link href="/" className="text-link">Browse all stories <span aria-hidden="true">↗</span></Link>
          </div>
        )}
      </section>
      <section className="shell closing-note">
        <div><span className="section-overline">An invitation to read differently</span><h2>Less noise.<br /><em>More meaning.</em></h2></div>
        <p>Next News is being built as a home for timely reporting and thoughtful context. A source-backed live feed will follow in a later development phase.</p>
      </section>
    </>
  );
}
