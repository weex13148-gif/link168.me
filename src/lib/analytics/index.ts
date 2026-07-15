/**
 * Analytics 分析工具库
 * 统一导出所有分析相关功能
 */

// 归因
export { parseUTMParams, inferChannel, getChannelLabel } from "./attribution";
export type { ChannelSource, UTMParams, AttributionResult } from "./attribution";

// 事件处理
export {
  parseDeviceInfo,
  getClientIp,
  hashIp,
  generateVisitorId,
  isPotentialBot,
  generateEventDedupeKey,
  generateEventDedupeId,
} from "./events";
export type { DeviceType, DeviceInfo, GeoInfo } from "./events";

// 统计
export {
  getAnalyticsStats,
  getCoreMvpMetrics,
  calculateConversionFunnel,
  getGeoStats,
  getTimeRange,
  getShortLinkStatsByUser,
  getSingleShortLinkStat,
} from "./stats";
export type {
  EventType,
  AnalyticsEvent,
  FunnelStep,
  ConversionFunnel,
  ShortLinkStat,
  CoreMvpMetrics,
} from "./stats";

// 短链接
export { recordShortLinkClick, getShortLinkStats } from "./short-links";
