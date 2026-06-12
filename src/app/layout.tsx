import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Link168",
  description: "Link168 是面向创作者、商家和个人品牌的移动优先链接主页。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
