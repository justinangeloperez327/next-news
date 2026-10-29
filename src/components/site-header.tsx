import Link from "next/link";
import { CATEGORIES } from "@/lib/news";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="utility-bar">
        <div className="shell utility-bar__inner">
          <span>Independent reading. Better context.</span>
          <span className="utility-bar__status"><span className="status-dot" /> Preview edition · Provider connection optional</span>
        </div>
      </div>
      <div className="shell header-main">
        <Link href="/" className="brand" aria-label="Next News home">
          <span className="brand-mark" aria-hidden="true">N<span>.</span></span>
          <span className="brand-wordmark">next<span>news</span></span>
        </Link>
        <div className="header-right">
          <Link href="/#stories" className="header-explore">Explore stories <span aria-hidden="true">↗</span></Link>
          <form action="/" method="get" role="search" className="search-form">
            <label htmlFor="header-search" className="sr-only">Search stories</label>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></svg>
            <input id="header-search" name="q" type="search" maxLength={100} placeholder="Search stories" />
          </form>
        </div>
      </div>
      <nav className="section-nav" aria-label="News sections">
        <div className="shell section-nav__inner">
          <Link href="/">All stories</Link>
          {CATEGORIES.map((category) => (
            <Link href={`/?category=${category.toLowerCase()}`} key={category}>{category}</Link>
          ))}
        </div>
      </nav>
      <a href="#main-content" className="skip-link">Skip to content</a>
    </header>
  );
}
