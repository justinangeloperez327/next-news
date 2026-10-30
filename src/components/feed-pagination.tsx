import Link from "next/link";
import { feedHref } from "@/lib/feed-navigation";
import type { Category } from "@/lib/news";

type FeedPaginationProps = {
  page: number;
  hasNextPage: boolean;
  category?: Category;
  query?: string;
};

export function FeedPagination({ page, hasNextPage, category, query }: FeedPaginationProps) {
  if (page <= 1 && !hasNextPage) return null;

  const filters = { category, query };
  return (
    <nav className="feed-pagination" aria-label="News feed pages">
      {page > 1 ? (
        <Link href={feedHref({ ...filters, page: page - 1 })} rel="prev">
          <span aria-hidden="true">←</span> Previous page
        </Link>
      ) : <span />}
      <span className="feed-pagination__counter">Page {page}</span>
      {hasNextPage ? (
        <Link href={feedHref({ ...filters, page: page + 1 })} rel="next">
          Next page <span aria-hidden="true">→</span>
        </Link>
      ) : <span />}
    </nav>
  );
}
