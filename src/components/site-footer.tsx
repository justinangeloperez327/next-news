import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div>
          <Link href="/" className="footer-brand">next<span>news</span></Link>
          <p>A quieter place for better-informed reading.</p>
        </div>
        <div className="footer-aside">
          <span>Prototype • Demonstration articles only</span>
          <span>© {new Date().getFullYear()} Next News</span>
        </div>
      </div>
    </footer>
  );
}
