import Link from "next/link";
import { LiveArticleCard, formatPublishedAt } from "@/components/live-article-card";
import { StoryCard } from "@/components/story-card";
import { getLiveFeed } from "@/lib/live-news";
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
  const query = firstValue(params.q)?.trim().slice(0, 100) ?? "";
  const isBrowsing = Boolean(category || query);
  const feed = await getLiveFeed({ category, query });
  const live = feed.status === "live";
  const liveArticles = feed.status === "live" ? feed.articles : [];
  const featureLive = !isBrowsing ? liveArticles[0] : undefined;
  const visibleLive = featureLive ? liveArticles.slice(1) : liveArticles;

  const stories = live ? [] : getStories({ category, query });
  const featureDemo = !isBrowsing ? stories[0] : undefined;
  const visibleDemo = featureDemo ? stories.filter((story) => story.slug !== featureDemo.slug) : stories;
  const count = live ? visibleLive.length : visibleDemo.length;

  return (
    <>
      <section className="shell intro">
        <div className="eyebrow"><span className="eyebrow-line" /> The Next News Journal <span className="eyebrow-line" /></div>
        <h1>Stay curious.<br /><em>See the bigger picture.</em></h1>
        <p>Ideas, perspectives, and explainers worth your attention — presented with clarity, not clutter.</p>
        <div className="intro-note">
          <span className="status-dot" />
          {live
            ? "Publisher-linked headlines. Cached for up to ten minutes; article availability depends on your provider plan."
            : "Preview experience: articles below are original demonstrations, not current headlines."}
        </div>
      </section>
      {feed.status === "unavailable" && (
        <div className="shell feed-notice" role="status">
          The news provider is unavailable. Showing original demonstration stories instead — not current headlines.
        </div>
      )}
      {featureLive && (
        <section className="shell featured-section" aria-labelledby="featured-heading">
          <div className="section-heading"><div><span className="section-overline">From the news feed</span><h2 id="featured-heading">The featured headline</h2></div><span className="section-counter">01 / Publisher-linked</span></div>
          <div className="feature-card">
            <a href={featureLive.url} target="_blank" rel="noopener noreferrer nofollow" className="feature-visual" aria-label={`Read at ${featureLive.sourceName} (opens in a new tab)`}>
              <span className="feature-visual__label">NEXT / NEWS FEED</span>
              <div className="feature-orbit" aria-hidden="true"><div className="feature-orbit__core" /></div>
              <span className="feature-visual__corner" aria-hidden="true">SOURCE ↗</span>
            </a>
            <div className="feature-copy">
              <span className="feature-category">{featureLive.sourceName} / <time dateTime={featureLive.publishedAt}>{formatPublishedAt(featureLive.publishedAt)}</time></span>
              <h3><a href={featureLive.url} target="_blank" rel="noopener noreferrer nofollow">{featureLive.title}</a></h3>
              {featureLive.description && <p>{featureLive.description}</p>}
              <div className="feature-bottom"><span>Original reporting by {featureLive.sourceName}</span><a href={featureLive.url} target="_blank" rel="noopener noreferrer nofollow" className="feature-button">Read at source <span aria-hidden="true">↗</span></a></div>
            </div>
          </div>
        </section>
      )}
      {featureDemo && (
        <section className="shell featured-section" aria-labelledby="featured-heading">
          <div className="section-heading"><div><span className="section-overline">In focus</span><h2 id="featured-heading">The featured read</h2></div><span className="section-counter">01 / Demonstration</span></div>
          <div className="feature-card">
            <Link href={`/stories/${featureDemo.slug}`} className="feature-visual" aria-label={`Read: ${featureDemo.title}`}>
              <span className="feature-visual__label">PERSPECTIVE / DEMO</span>
              <div className="feature-orbit" aria-hidden="true"><div className="feature-orbit__core" /></div>
              <span className="feature-visual__corner" aria-hidden="true">N° 01</span>
            </Link>
            <div className="feature-copy">
              <span className="feature-category">{featureDemo.category} / Demonstration</span>
              <h3><Link href={`/stories/${featureDemo.slug}`}>{featureDemo.title}</Link></h3>
              <p>{featureDemo.excerpt}</p>
              <div className="feature-bottom"><span>{featureDemo.readingMinutes} min read</span><Link href={`/stories/${featureDemo.slug}`} className="feature-button">Explore this story <span aria-hidden="true">↗</span></Link></div>
            </div>
          </div>
        </section>
      )}
      <section className="shell stories-section" id="stories" aria-labelledby="stories-heading">
        <div className="section-heading">
          <div>
            <span className="section-overline">{live ? "From external publishers" : isBrowsing ? "Browse the collection" : "Thoughtful demo reads"}</span>
            <h2 id="stories-heading">{query ? `Results for “${query}”` : category ? `${category} stories` : live ? "More headlines" : "Explore the stories"}</h2>
          </div>
          <span className="section-counter">{count} {count === 1 ? "story" : "stories"}</span>
        </div>
        {count > 0 ? (
          <div className="story-grid">
            {live
              ? visibleLive.map((article, index) => <LiveArticleCard key={article.id} article={article} index={index + (featureLive ? 1 : 0)} />)
              : visibleDemo.map((story, index) => <StoryCard key={story.slug} story={story} index={index} />)}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No stories found.</h3>
            <p>{live ? "Try another topic or section; coverage depends on your provider subscription." : "Try another keyword or explore every section."}</p>
            <Link href="/" className="text-link">Browse all stories <span aria-hidden="true">↗</span></Link>
          </div>
        )}
      </section>
      <section className="shell closing-note">
        <div><span className="section-overline">An invitation to read differently</span><h2>Less noise.<br /><em>More meaning.</em></h2></div>
        <p>When connected, Next News links directly to publishers and shows source names and publication dates. This prototype does not host or reproduce full third-party articles.</p>
      </section>
    </>
  );
}
