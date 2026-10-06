import Link from "next/link";
import { publicFooterGroups } from "../lib/public-nav";
import { Brand } from "./brand";
export function ProductFooter({ compact = false }: { compact?: boolean }) {
  return (
    <footer className="sr-footer">
      <div className="sr-page-rail">
        {compact ? (
          <div className="sr-footer-compact">
            <Brand />
            <p>Your logs stay in your browser.</p>
            <Link href="/catalog">Models & plans</Link>
            <Link href="/methodology#privacy">Privacy</Link>
          </div>
        ) : (
          <>
            <div className="sr-footer-grid">
              <div>
                <Brand />
                <p>
                  Your AI coding, replayed.
                  <br />
                  Your history. On your terms.
                </p>
              </div>
              {publicFooterGroups.map((group) => (
                <div key={group.title}>
                  <h2>{group.title}</h2>
                  <ul>
                    {group.items.map((item) => (
                      <li key={item.href}>
                        {"external" in item && item.external ? (
                          <a href={item.href} target="_blank" rel="noreferrer">
                            {item.label}
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        ) : (
                          <Link href={item.href}>{item.label}</Link>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="sr-footer-note">
              <span>In your browser. No uploaded logs.</span>
              <span>Open source · AGPL-3.0</span>
            </div>
          </>
        )}
      </div>
    </footer>
  );
}
