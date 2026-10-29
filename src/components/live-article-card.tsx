import type { LiveArticle } from "@/lib/live-news";

const categoryTone: Record<LiveArticle["category"], string> = {
  "Top Stories": "blue",
  World: "blue",
  Technology: "violet",
  Business: "orange",
  Science: "teal",
  Climate: "green",
  Culture: "rose",
};

export function formatPublishedAt(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function LiveArticleCard({ article, index }: { article: LiveArticle; index: number }) {
  const publishedLabel = formatPublishedAt(article.publishedAt);

  return (
    <article className="story-card">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className={`story-illustration art--${categoryTone[article.category]}`}
        aria-label={`Read at ${article.sourceName}: ${article.title} (opens in new tab)`}
      >
        <span className="illustration-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
        <span className="illustration-shape" aria-hidden="true" />
        <span className="illustration-line" aria-hidden="true" />
      </a>
      <div className="card-meta"><span>{article.sourceName}</span><span><time dateTime={article.publishedAt}>{publishedLabel}</time></span></div>
      <h3><a href={article.url} target="_blank" rel="noopener noreferrer nofollow">{article.title}</a></h3>
      {article.description && <p>{article.description}</p>}
      <a className="text-link" href={article.url} target="_blank" rel="noopener noreferrer nofollow">
        Read at {article.sourceName} <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}
