"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export const navLinks = [
  { href: "/candidates/search", id: "candidate-search", label: "후보자 검색" },
  { href: "/?election=regional-executive", id: "regional-executive", label: "시·도지사 분석" },
  { href: "/analysis/education-wordcloud", id: "education", label: "교육감 분석" },
  { href: "/?election=local-executive", id: "local-executive", label: "시·군·구청장 분석" }
];

function activeNavId(pathname: string, election: string | null) {
  if (pathname.startsWith("/candidates/search")) {
    return "candidate-search";
  }

  if (pathname.startsWith("/analysis/education-wordcloud")) {
    return "education";
  }

  if (pathname === "/" && election === "regional-executive") {
    return "regional-executive";
  }

  if (pathname === "/" && election === "local-executive") {
    return "local-executive";
  }

  return undefined;
}

export function SiteNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = activeNavId(pathname, searchParams.get("election"));

  return (
    <header className="site-navbar">
      <div className="site-navbar-inner">
        <Link className="site-brand" href="/">
          <strong>정치한번 읽어볼까</strong>
        </Link>
        <nav aria-label="주요 메뉴" className="site-nav-links">
          {navLinks.map((link) => (
            <Link
              aria-current={activeId === link.id ? "page" : undefined}
              className={`site-nav-link ${activeId === link.id ? "active" : ""}`}
              href={link.href}
              key={link.id}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function SiteNavbarFallback() {
  return (
    <header className="site-navbar">
      <div className="site-navbar-inner">
        <Link className="site-brand" href="/">
          <strong>정치한번 읽어볼까</strong>
        </Link>
        <nav aria-label="주요 메뉴" className="site-nav-links">
          {navLinks.map((link) => (
            <Link className="site-nav-link" href={link.href} key={link.id}>
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
