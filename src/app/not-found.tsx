import Link from "next/link";

export default function NotFound() {
  return (
    <div className="shell not-found">
      <span className="section-overline">404 / Not found</span>
      <h1>There is no story here.</h1>
      <p>This page may have moved, or the link might be incorrect.</p>
      <Link className="feature-button" href="/">Return to Next News <span aria-hidden="true">↗</span></Link>
    </div>
  );
}
