import type { CSSProperties, ReactNode } from "react";
import type { PublicProfileRenderMode } from "@/components/share/public-profile-types";

type PublicModuleListProps = {
  renderMode: PublicProfileRenderMode;
  gap: number;
  items: Array<{ id: string; node: ReactNode }>;
};

export const PUBLIC_MODULE_SURFACE_STYLE = {
  backgroundColor: "var(--profile-card-background, rgb(255 253 248 / var(--profile-card-opacity, 1)))",
  borderColor: "var(--profile-card-border-color, #E8DCCB)",
  borderRadius: "var(--profile-button-radius, 16px)",
  boxShadow: "var(--profile-card-shadow, 0 1px 2px rgb(86 68 46 / 0.08))",
  backdropFilter: "var(--profile-card-backdrop, none)",
  color: "var(--profile-text-color, #2B241E)",
} as CSSProperties;

export const PUBLIC_PROFILE_BUTTON_STYLE = {
  backgroundColor: "var(--profile-button-background, #31543D)",
  borderColor: "var(--profile-button-border-color, #31543D)",
  borderRadius: "var(--profile-button-radius, 16px)",
  color: "var(--profile-button-color, #FFFFFF)",
} as CSSProperties;

export function PublicModuleList({ renderMode, gap, items }: PublicModuleListProps) {
  if (items.length === 0) {
    if (renderMode === "public") return null;
    return (
      <div className="rounded-2xl border border-dashed border-[#D8C9B4] bg-white/45 px-5 py-8 text-center text-sm font-bold text-[#6D6256]">
        添加服务、案例或咨询组件
      </div>
    );
  }

  return (
    <div data-public-module-list className="grid" style={{ gap: `${gap}px` }}>
      {items.map((item) => <div key={item.id}>{item.node}</div>)}
    </div>
  );
}
