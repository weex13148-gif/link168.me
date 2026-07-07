import type { ReactNode } from "react";

export type PreviewShellVariant = "marketing" | "auth" | "public";

export type PreviewShellProps = {
  variant?: PreviewShellVariant;
  className?: string;
  surfaceClassName?: string;
  showStatusBar?: boolean;
  statusText?: string;
  children: ReactNode;
};

const shellByVariant: Record<PreviewShellVariant, string> = {
  marketing: "shadow-[0_28px_90px_rgba(86,68,46,0.22)]",
  auth: "shadow-[0_22px_60px_rgba(86,68,46,0.16)]",
  public: "shadow-[0_20px_70px_rgba(86,68,46,0.18)]",
};

export function PreviewShell({
  variant = "marketing",
  className = "",
  surfaceClassName,
  showStatusBar = true,
  statusText,
  children,
}: PreviewShellProps) {
  return (
    <div
      className={`phone-preview link168-phone-shell mx-auto w-full max-w-[390px] p-2.5 ${shellByVariant[variant]} ${className}`}
    >
      <div
        className={`link168-phone-screen flex h-full flex-col overflow-hidden ${
          surfaceClassName || "bg-[#F7F1E7]"
        }`}
      >
        {showStatusBar ? (
          <div className="flex shrink-0 items-center justify-between border-b border-[#E8DCCB]/70 px-4 py-3 text-[#2B241E]">
            <span className="text-xs font-black">{statusText || "9:41"}</span>
            <div className="h-1.5 w-20 rounded-full bg-[#2B241E]/10" />
            <span className="text-xs font-black">5G</span>
          </div>
        ) : null}

        <div className="phone-preview-scroll flex-1 overflow-y-auto px-4 pb-5 pt-6">
          {children}
        </div>
      </div>
    </div>
  );
}
