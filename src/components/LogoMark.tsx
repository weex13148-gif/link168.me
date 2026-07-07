import { BrandLogo } from "@/components/BrandLogo";

export function LogoMark({ compact = false }: { compact?: boolean }) {
  return <BrandLogo size={compact ? "compact" : "header"} />;
}
