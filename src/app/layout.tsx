import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Link1688",
  description: "Link1688 是面向创作者、商家和个人品牌的移动优先链接主页。",
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
