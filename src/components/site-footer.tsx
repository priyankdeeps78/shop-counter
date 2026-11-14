import Link from "next/link";
import { NAV_LINKS, SHOP_CATEGORIES } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-container">
        <div className="footer-main">
          <div className="footer-brand">
            <Link href="/shop" className="wordmark footer-wordmark">
              <span className="wordmark-icon" aria-hidden="true" />
              Shop counter
            </Link>
            <p>A small shop for lighting, furniture, and stationery.</p>
          </div>

          <nav className="footer-nav" aria-label="Footer">
            <div>
              <h2>Browse</h2>
              <ul className="footer-links">
                <li><Link href="/shop#collection">All products</Link></li>
                {SHOP_CATEGORIES.map(({ href, label }) => (
                  <li key={href}><Link href={href} prefetch={false}>{label}</Link></li>
                ))}
              </ul>
            </div>
            <div>
              <h2>Navigate</h2>
              <ul className="footer-links">
                {NAV_LINKS.map(({ href, label }) => (
                  <li key={href}><Link href={href}>{label === "Desk" ? "Staff desk" : label}</Link></li>
                ))}
              </ul>
            </div>
          </nav>
        </div>

        <div className="footer-bottom">
          <p>Demo storefront · Payments are simulated.</p>
          <a className="footer-top-link" href="#site-top">
            Back to top <span aria-hidden="true">↑</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
