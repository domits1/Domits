export const SURFACE_KPI_TAB_PREVIEW = "preview";
export const SURFACE_KPI_TAB_LIVE = "live";

export const SURFACE_KPI_TAB_OPTIONS = Object.freeze([
  { id: SURFACE_KPI_TAB_PREVIEW, label: "Preview" },
  { id: SURFACE_KPI_TAB_LIVE, label: "Live" },
]);

export const EMPTY_WEBSITE_KPIS = Object.freeze({
  currentDraftCount: 0,
  draftCreatedCount: 0,
  draftSaveCount: 0,
  buildStartedCount: 0,
  buildSucceededCount: 0,
  buildFailedCount: 0,
  buildAbandonedCount: 0,
  buildSuccessRate: null,
  buildFailureRate: null,
  buildAbandonmentRate: null,
  timeToFirstPreviewP95: null,
  publicPreviewViewCount: 0,
  uniquePreviewedWebsiteCount: 0,
  livePreviewUpdateCount: 0,
  deletedWebsiteCount: 0,
  lastPublicPreviewAt: 0,
  lastLivePreviewUpdateAt: 0,
  previewSiteLcpMobileP75: null,
  liveSiteLcpMobileP75: null,
  timeToPublishP95: null,
  costPerActiveSitePerMonth: null,
  siteLcpMobileP75: null,
  fallbackSubdomainAvailability: null,
  quoteToChargeMismatchRate: null,
  bookingApiErrorRate: null,
  bookingFunnelCompletionRate: null,
  customDomainSetupSuccessRate: null,
  deletionReasonBreakdown: [],
});

const RESEARCH_KPI_DEFINITIONS = Object.freeze([
  {
    id: "time_to_publish_p95",
    criteria: ["Scalability", "User experience"],
    valueKey: "timeToPublishP95",
    formatter: (value) => `${value.toFixed(1)} min`,
    emptyValue: "Pending",
    note:
      "Requires a real publish lifecycle with publish-requested and publish-succeeded timestamps. The current preview-link workflow is not the final publish contract.",
  },
  {
    id: "cost_per_active_site_per_month",
    criteria: ["Scalability", "Cost"],
    valueKey: "costPerActiveSitePerMonth",
    formatter: (value) => `EUR ${value.toFixed(2)}`,
    emptyValue: "Pending",
    note:
      "Requires infrastructure cost allocation plus a real count of active published sites. Drafts and preview links are not enough for a defensible value.",
  },
  {
    id: "site_lcp_mobile_p75",
    criteria: ["Performance"],
    valueKey: "siteLcpMobileP75",
    formatter: (value) => `${value.toFixed(2)} s`,
    emptyValue: "Pending",
    note:
      "Live mobile web-vitals telemetry still requires a real published standalone website surface. Preview LCP is tracked separately in this dashboard.",
  },
  {
    id: "fallback_subdomain_availability",
    criteria: ["Reliability"],
    valueKey: "fallbackSubdomainAvailability",
    formatter: (value) => `${value.toFixed(2)}%`,
    emptyValue: "Pending",
    note:
      "Requires real fallback subdomain routing plus synthetic availability checks. Preview links do not represent subdomain uptime.",
  },
  {
    id: "booking_api_error_rate",
    criteria: ["Reliability", "Correctness"],
    valueKey: "bookingApiErrorRate",
    formatter: (value) => `${value.toFixed(2)}%`,
    emptyValue: "Pending",
    note:
      "Requires the standalone booking API path to be live and instrumented. This remains a v2 metric until direct booking flow is active.",
  },
  {
    id: "quote_to_charge_mismatch_rate",
    criteria: ["Correctness"],
    valueKey: "quoteToChargeMismatchRate",
    formatter: (value) => `${value.toFixed(2)}%`,
    emptyValue: "Pending",
    note:
      "Requires quote issuance and final successful charge comparison. That data does not exist until checkout and payment instrumentation is in place.",
  },
  {
    id: "booking_funnel_completion_rate",
    criteria: ["User experience"],
    valueKey: "bookingFunnelCompletionRate",
    formatter: (value) => `${value.toFixed(2)}%`,
    emptyValue: "Pending",
    note:
      "Requires end-to-end funnel events from quote to completed booking. Current standalone website analytics stop at draft and preview usage.",
  },
  {
    id: "custom_domain_setup_success_rate",
    criteria: ["User experience"],
    valueKey: "customDomainSetupSuccessRate",
    formatter: (value) => `${value.toFixed(2)}%`,
    emptyValue: "Pending",
    note:
      "Requires custom-domain setup flow, verification states, and success/failure events. That domain workflow is not implemented yet.",
  },
]);

export const formatKpiTimestamp = (timestamp) => {
  const parsedValue = Number(timestamp);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return "No data yet";
  }

  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(parsedValue));
  } catch {
    return "No data yet";
  }
};

export const formatNullablePercentage = (value) =>
  typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}%` : "No data yet";

export const formatNullableDurationMs = (value) =>
  typeof value === "number" && Number.isFinite(value) ? `${(value / 1000).toFixed(2)} s` : "No data yet";

export const buildWebsiteMetricCards = (websiteKpis) => [
  {
    id: "active-websites",
    title: "Active website drafts",
    value: websiteKpis.currentDraftCount,
    meta: `${websiteKpis.draftCreatedCount} drafts created across Domits`,
  },
  {
    id: "build-started",
    title: "Build attempts started",
    value: websiteKpis.buildStartedCount,
    meta: "How often hosts pressed Build my website",
  },
  {
    id: "build-succeeded",
    title: "Successful website builds",
    value: websiteKpis.buildSucceededCount,
    meta: "Build attempts that reached preview and persisted a draft successfully",
  },
  {
    id: "time-to-first-preview",
    title: "Time to first preview p95",
    value: formatNullableDurationMs(websiteKpis.timeToFirstPreviewP95),
    meta: "95th percentile from build click until preview rendered and usable",
  },
  {
    id: "build-success-rate",
    title: "Build success rate",
    value: formatNullablePercentage(websiteKpis.buildSuccessRate),
    meta: "Successful website builds divided by all recorded build starts",
  },
  {
    id: "build-failure-rate",
    title: "Build failure rate",
    value: formatNullablePercentage(websiteKpis.buildFailureRate),
    meta: "Build attempts that ended in a recorded failure",
  },
  {
    id: "build-abandonment-rate",
    title: "Build abandonment rate",
    value: formatNullablePercentage(websiteKpis.buildAbandonmentRate),
    meta: `${websiteKpis.buildAbandonedCount} attempts passed the 10 minute threshold without success or failure`,
  },
  {
    id: "draft-saves",
    title: "Draft saves",
    value: websiteKpis.draftSaveCount,
    meta: "How often saved editor changes were recorded",
  },
  {
    id: "preview-opens",
    title: "Preview link opens",
    value: websiteKpis.publicPreviewViewCount,
    meta: `Last preview opened: ${formatKpiTimestamp(websiteKpis.lastPublicPreviewAt)}`,
  },
  {
    id: "unique-previewed",
    title: "Unique sites previewed",
    value: websiteKpis.uniquePreviewedWebsiteCount,
    meta: "Distinct website drafts opened through shared preview links",
  },
  {
    id: "live-preview-updates",
    title: "Live preview updates",
    value: websiteKpis.livePreviewUpdateCount,
    meta: `Last update pushed: ${formatKpiTimestamp(websiteKpis.lastLivePreviewUpdateAt)}`,
  },
  {
    id: "deleted-websites",
    title: "Deleted websites",
    value: websiteKpis.deletedWebsiteCount,
    meta: "Website drafts removed from the standalone website workspace",
  },
];

export const buildSurfacePerformanceCards = (websiteKpis) => ({
  [SURFACE_KPI_TAB_PREVIEW]: {
    title: "Preview surface performance",
    description:
      "Preview LCP is captured from the public preview route when it is opened on a mobile viewport.",
    metrics: [
      {
        id: "preview-site-lcp-mobile-p75",
        title: "site_lcp_mobile_p75",
        value: formatNullableDurationMs(websiteKpis.previewSiteLcpMobileP75),
        meta: "75th percentile Largest Contentful Paint for preview visits on mobile.",
      },
    ],
  },
  [SURFACE_KPI_TAB_LIVE]: {
    title: "Live surface performance",
    description:
      "Live-site web-vitals remain pending until the published standalone website surface and routing are active.",
    metrics: [
      {
        id: "live-site-lcp-mobile-p75",
        title: "site_lcp_mobile_p75",
        value: formatNullableDurationMs(websiteKpis.liveSiteLcpMobileP75),
        meta: "No live standalone site telemetry is being recorded yet.",
      },
    ],
  },
});

export const buildResearchKpiCards = (websiteKpis) =>
  RESEARCH_KPI_DEFINITIONS.map((researchKpi) => {
    const rawValue = websiteKpis[researchKpi.valueKey];
    const isInstrumented = typeof rawValue === "number" && Number.isFinite(rawValue);

    return {
      ...researchKpi,
      isInstrumented,
      value: isInstrumented ? researchKpi.formatter(rawValue) : researchKpi.emptyValue,
      statusLabel: isInstrumented ? "Instrumented" : "Not instrumented yet",
    };
  });
