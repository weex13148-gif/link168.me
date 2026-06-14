import Image from "next/image";
import Link from "next/link";

type BrandLogoSize = "header" | "compact" | "footer";

type BrandLogoProps = {
  size?: BrandLogoSize;
  className?: string;
};

const sizeClasses: Record<BrandLogoSize, string> = {
  header: "w-[118px] max-w-[40vw]",
  compact: "w-[96px] max-w-[36vw]",
  footer: "w-[76px] max-w-[30vw]",
};

export function BrandLogo({ size = "header", className = "" }: BrandLogoProps) {
  return (
    <Link
      href="/"
      aria-label="Link168 链接一路发"
      className={`inline-flex shrink-0 cursor-pointer items-center opacity-90 transition duration-200 hover:opacity-100 hover:brightness-105 active:scale-[0.99] ${sizeClasses[size]} ${className}`}
    >
      <Image
        src="/brand/link168-logo.png"
        alt="Link168 链接一路发"
        width={1536}
        height={864}
        priority={size === "header"}
        sizes={size === "header" ? "132px" : size === "compact" ? "104px" : "82px"}
        className="h-auto w-full object-contain"
      />
    </Link>
  );
}
