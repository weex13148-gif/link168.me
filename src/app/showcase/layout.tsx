import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Link168 · TRAE 创业比赛演示",
  description: "Link168 数字主页、二维码与 AI 经营助手的比赛审核演示页面。",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function ShowcaseLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
