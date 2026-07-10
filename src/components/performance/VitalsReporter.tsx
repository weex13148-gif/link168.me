"use client";

import { useReportWebVitals } from "next/web-vitals";

export function VitalsReporter() {
  useReportWebVitals((metric) => {
    // 开发环境直接输出到控制台
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(`[WebVital] ${metric.name}:`, metric.value, metric);
      return;
    }

    // 生产环境发送到服务端收集
    const payload = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/vitals", JSON.stringify(payload));
      } else {
        fetch("/api/analytics/vitals", {
          method: "POST",
          body: JSON.stringify(payload),
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        }).catch(() => {});
      }
    } catch {
      // 静默失败，不影响业务
    }
  });

  return null;
}
