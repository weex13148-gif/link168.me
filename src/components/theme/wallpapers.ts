export type BuiltInWallpaper = {
  id: string;
  label: string;
  src: string;
  fallback: string;
};

export const BUILT_IN_WALLPAPERS: BuiltInWallpaper[] = [
  {
    id: "mist-forest",
    label: "晨雾森林",
    src: "/wallpapers/mist-forest.webp",
    fallback: "linear-gradient(135deg,#DDE8CD,#F7F1E7)",
  },
  {
    id: "warm-paper",
    label: "暖纸微光",
    src: "/wallpapers/warm-paper.webp",
    fallback: "linear-gradient(135deg,#F2E7D8,#FFFDF8)",
  },
  {
    id: "jade-gradient",
    label: "青玉流光",
    src: "/wallpapers/jade-gradient.webp",
    fallback: "linear-gradient(135deg,#C7D9C0,#EEF4E7)",
  },
  {
    id: "sand-dunes",
    label: "浅金沙丘",
    src: "/wallpapers/sand-dunes.webp",
    fallback: "linear-gradient(135deg,#EAD9BD,#FFF4E5)",
  },
  {
    id: "blue-mountain",
    label: "远山青蓝",
    src: "/wallpapers/blue-mountain.webp",
    fallback: "linear-gradient(135deg,#C8D8DD,#EDF3F2)",
  },
  {
    id: "ink-leaves",
    label: "墨绿枝叶",
    src: "/wallpapers/ink-leaves.webp",
    fallback: "linear-gradient(135deg,#284737,#DDE8CD)",
  },
];
