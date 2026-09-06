import type { CurrentPageKind, CurrentPageStatus } from "@/lib/current/contracts";

export type CurrentBoundarySource = "draft" | "published";

export type CurrentRendererViewport = "mobile" | "desktop";

export interface CurrentPageAction {
  label: string;
  href?: string | null;
  kind?: "primary" | "secondary" | "quiet";
  disabled?: boolean;
  reason?: string | null;
}

export interface CurrentBoundaryDraftProps {
  source: "draft";
  draftLabel: string;
  publicWarning: string;
  publishedVersionLabel?: string | null;
}

export interface CurrentBoundaryPublishedProps {
  source: "published";
  publishedLabel: string;
  publishedVersionLabel: string;
  canonicalUrl?: string | null;
}

export type CurrentBoundaryProps =
  | CurrentBoundaryDraftProps
  | CurrentBoundaryPublishedProps;

export interface CurrentRenderHero {
  eyebrow?: string | null;
  title: string;
  subtitle?: string | null;
  summary: string;
  avatarUrl?: string | null;
  primaryAction?: CurrentPageAction | null;
  secondaryAction?: CurrentPageAction | null;
  meta?: readonly string[];
}

export interface CurrentRenderOffering {
  id: string;
  title: string;
  summary: string;
  priceLabel?: string | null;
  badge?: string | null;
}

export interface CurrentRenderLink {
  id: string;
  label: string;
  href?: string | null;
  description?: string | null;
}

export interface CurrentRenderContact {
  label: string;
  value: string;
  href?: string | null;
}

export interface CurrentRenderSection {
  id: string;
  label: string;
  description?: string | null;
  tone?: "default" | "muted" | "highlight";
  content: readonly string[];
}

export interface CurrentRenderFooter {
  reportHref?: string | null;
  brandLabel?: string | null;
  note?: string | null;
}

export interface CurrentPageRenderModel {
  pageKind: CurrentPageKind;
  pageStatus: CurrentPageStatus;
  pageName: string;
  publicIdentity?: string | null;
  boundary: CurrentBoundaryProps;
  hero: CurrentRenderHero;
  offerings?: readonly CurrentRenderOffering[];
  sections?: readonly CurrentRenderSection[];
  links?: readonly CurrentRenderLink[];
  contacts?: readonly CurrentRenderContact[];
  footer?: CurrentRenderFooter;
}

export interface CurrentPreviewStateProps {
  boundary: CurrentBoundaryDraftProps;
  pageStatus: CurrentPageStatus;
  missingRequirements?: readonly string[];
  publishAction?: CurrentPageAction | null;
}

export interface CurrentPublicStateProps {
  title: string;
  description: string;
  action?: CurrentPageAction | null;
}
