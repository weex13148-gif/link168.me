import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Link168 - 个人数字名片与客户入口",
    short_name: "Link168",
    description: "用一个公开主页集中展示内容、服务、联系方式和二维码，让客户快速找到你。",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f5f0",
    theme_color: "#5f7f45",
    orientation: "portrait",
    scope: "/",
    lang: "zh-CN",
    categories: ["business", "productivity", "social"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}
