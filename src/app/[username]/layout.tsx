import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export default function UsernameLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
