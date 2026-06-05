import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "정치한번 읽어볼까",
  description: "전국 지방선거 후보자 공약 검색 서비스"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
