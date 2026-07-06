"use client";

import Script from "next/script";

interface JsonLdProps {
  schema: unknown;
}

export function JsonLd({ schema }: JsonLdProps) {
  return (
    <Script
      id="json-ld"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      strategy="beforeInteractive"
    />
  );
}
