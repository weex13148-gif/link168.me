"use client";

import { useEffect } from "react";

export default function ShowcaseVisitLogger() {
  useEffect(() => {
    const screenSize = `${window.screen.width}x${window.screen.height}`;
    const viewportSize = `${window.innerWidth}x${window.innerHeight}`;
    const nav = window.navigator as Navigator & { userAgentData?: { platform?: string; mobile?: boolean } };
    const deviceModel = nav.userAgentData?.platform || null;
    fetch("/api/showcase/visit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ screenSize, viewportSize, deviceModel }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);
  return null;
}
