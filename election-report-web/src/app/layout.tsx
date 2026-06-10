import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteNavbar, SiteNavbarFallback } from "./SiteNavbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "정치한번 읽어볼까",
  description:
    "중앙선거관리위원회 공개데이터를 바탕으로 후보 공약과 당선 결과를 함께 분석하는 웹앱"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Suspense fallback={<SiteNavbarFallback />}>
          <SiteNavbar />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
