import Link from "next/link";
import { NAV_LINKS } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container footer-inner">
        <div className="footer-brand">
          <Link href="/shop" className="wordmark">
            <span className="wordmark-icon" aria-hidden="true" /> Shop counter
          </Link>
          <p>Demo storefront · Payments are simulated.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="footer-links">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}><Link href={href}>{label}</Link></li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
