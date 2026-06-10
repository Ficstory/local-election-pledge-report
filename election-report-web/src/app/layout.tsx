import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "정치한번 읽어볼까",
  description:
    "중앙선거관리위원회 공개데이터를 바탕으로 후보 공약과 당선 결과를 함께 분석하는 웹앱"
};

const navLinks = [
  { href: "/#analysis-method", label: "공약 분석" },
  { href: "/?election=education", label: "후보 비교" },
  { href: "/analysis/education-wordcloud", label: "당선 키워드" },
  { href: "/#data-source", label: "데이터 출처" }
];

function SiteNavbar() {
  return (
    <header className="site-navbar">
      <div className="site-navbar-inner">
        <Link className="site-brand" href="/">
          <strong>정치한번 읽어볼까</strong>
        </Link>
        <nav aria-label="주요 메뉴" className="site-nav-links">
          {navLinks.map((link) => (
            <Link className="site-nav-link" href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
          <Link className="site-nav-cta" href="/?election=regional-executive">
            분석 보기
          </Link>
        </nav>
      </div>
    </header>
  );
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <SiteNavbar />
        {children}
      </body>
    </html>
  );
}
