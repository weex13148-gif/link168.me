import type { Metadata } from "next";
import "./globals.css";
import { VitalsReporter } from "@/components/performance/VitalsReporter";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://link168.me";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Link168｜个人数字名片与客户入口",
    template: "%s｜Link168",
  },
  description: "用一个公开主页集中展示内容、服务、联系方式和二维码，让客户快速找到你。",
  applicationName: "Link168",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Link168",
    title: "Link168｜个人数字名片与客户入口",
    description: "用一个公开主页集中展示内容、服务、联系方式和二维码，让客户快速找到你。",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Link168｜个人数字名片与客户入口",
    description: "用一个公开主页集中展示内容、服务、联系方式和二维码，让客户快速找到你。",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <VitalsReporter />
        {children}
      </body>
    </html>
  );
}
