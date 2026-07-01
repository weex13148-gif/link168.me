"use client";

/**
 * V1 dashboard reserved entry.
 *
 * The active production dashboard remains src/app/dashboard/page.tsx. This
 * component stays available for the new dashboard-v1 modules without importing
 * a DashboardRuntime file that has not been implemented yet.
 */
export default function DashboardV1Client(_props: Record<string, unknown>) {
  return null;
}
