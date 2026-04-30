export { EMPTY_WEBSITE_KPIS } from "./websiteKpiFields";

export const SURFACE_KPI_TAB_PREVIEW = "preview";
export const SURFACE_KPI_TAB_LIVE = "live";

export const SURFACE_KPI_TAB_OPTIONS = Object.freeze([
  { id: SURFACE_KPI_TAB_PREVIEW, label: "Preview" },
  { id: SURFACE_KPI_TAB_LIVE, label: "Live" },
]);

const createResearchKpiDefinition = ({ id, criteria, valueKey, formatter, note }) => ({
  id,
  criteria,
  valueKey,
  formatter,
  emptyValue: "Pending",
  note,
});

const RESEARCH_KPI_DEFINITIONS = Object.freeze([
  createResearchKpiDefinition({
    id: "time_to_publish_p95",
    criteria: ["Scalability", "User experience"],
    valueKey: "timeToPublishP95",
    formatter: (value) => `${value.toFixed(1)} min`,
    note:
      "Requires a real publish lifecycle with publish-requested and publish-succeeded timestamps. The current preview-link workflow is not the final publish contract.",
  }),
  createResearchKpiDefinition({
    id: "cost_per_active_site_per_month",
    criteria: ["Scalability", "Cost"],
    valueKey: "costPerActiveSitePerMonth",
    formatter: (value) => `EUR ${value.toFixed(2)}`,
    note:
      "Requires infrastructure cost allocation plus a real count of active published sites. Drafts and preview links are not enough for a defensible value.",
  }),
  createResearchKpiDefinition({
    id: "site_lcp_mobile_p75",
    criteria: ["Performance"],
    valueKey: "siteLcpMobileP75",
    formatter: (value) => `${value.toFixed(2)} s`,
    note:
      "Live mobile web-vitals telemetry still requires a real published standalone website surface. Preview LCP is tracked separately in this dashboard.",
  }),
  createResearchKpiDefinition({
    id: "fallback_subdomain_availability",
    criteria: ["Reliability"],
    valueKey: "fallbackSubdomainAvailability",
    formatter: (value) => `${value.toFixed(2)}%`,
    note:
      "Requires real fallback subdomain routing plus synthetic availability checks. Preview links do not represent subdomain uptime.",
  }),
  createResearchKpiDefinition({
    id: "booking_api_error_rate",
    criteria: ["Reliability", "Correctness"],
    valueKey: "bookingApiErrorRate",
    formatter: (value) => `${value.toFixed(2)}%`,
    note:
      "Requires the standalone booking API path to be live and instrumented. This remains a v2 metric until direct booking flow is active.",
  }),
  createResearchKpiDefinition({
    id: "quote_to_charge_mismatch_rate",
    criteria: ["Correctness"],
    valueKey: "quoteToChargeMismatchRate",
    formatter: (value) => `${value.toFixed(2)}%`,
    note:
      "Requires quote issuance and final successful charge comparison. That data does not exist until checkout and payment instrumentation is in place.",
  }),
  createResearchKpiDefinition({
    id: "booking_funnel_completion_rate",
    criteria: ["User experience"],
    valueKey: "bookingFunnelCompletionRate",
    formatter: (value) => `${value.toFixed(2)}%`,
    note:
      "Requires end-to-end funnel events from quote to completed booking. Current standalone website analytics stop at draft and preview usage.",
  }),
  createResearchKpiDefinition({
    id: "custom_domain_setup_success_rate",
    criteria: ["User experience"],
    valueKey: "customDomainSetupSuccessRate",
    formatter: (value) => `${value.toFixed(2)}%`,
    note:
      "Requires custom-domain setup flow, verification states, and success/failure events. That domain workflow is not implemented yet.",
  }),
]);

const createMetricCard = (id, title, value, meta) => ({
  id,
  title,
  value,
  meta,
});

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
  createMetricCard(
    "active-websites",
    "Active website drafts",
    websiteKpis.currentDraftCount,
    `${websiteKpis.draftCreatedCount} drafts created across Domits`
  ),
  createMetricCard(
    "build-started",
    "Build attempts started",
    websiteKpis.buildStartedCount,
    "How often hosts pressed Build my website"
  ),
  createMetricCard(
    "build-succeeded",
    "Successful website builds",
    websiteKpis.buildSucceededCount,
    "Build attempts that reached preview and persisted a draft successfully"
  ),
  createMetricCard(
    "time-to-first-preview",
    "Time to first preview p95",
    formatNullableDurationMs(websiteKpis.timeToFirstPreviewP95),
    "95th percentile from build click until preview rendered and usable"
  ),
  createMetricCard(
    "build-success-rate",
    "Build success rate",
    formatNullablePercentage(websiteKpis.buildSuccessRate),
    "Successful website builds divided by all recorded build starts"
  ),
  createMetricCard(
    "build-failure-rate",
    "Build failure rate",
    formatNullablePercentage(websiteKpis.buildFailureRate),
    "Build attempts that ended in a recorded failure"
  ),
  createMetricCard(
    "build-abandonment-rate",
    "Build abandonment rate",
    formatNullablePercentage(websiteKpis.buildAbandonmentRate),
    `${websiteKpis.buildAbandonedCount} attempts passed the 10 minute threshold without success or failure`
  ),
  createMetricCard(
    "draft-saves",
    "Draft saves",
    websiteKpis.draftSaveCount,
    "How often saved editor changes were recorded"
  ),
  createMetricCard(
    "preview-opens",
    "Preview link opens",
    websiteKpis.publicPreviewViewCount,
    `Last preview opened: ${formatKpiTimestamp(websiteKpis.lastPublicPreviewAt)}`
  ),
  createMetricCard(
    "unique-previewed",
    "Unique sites previewed",
    websiteKpis.uniquePreviewedWebsiteCount,
    "Distinct website drafts opened through shared preview links"
  ),
  createMetricCard(
    "live-preview-updates",
    "Live preview updates",
    websiteKpis.livePreviewUpdateCount,
    `Last update pushed: ${formatKpiTimestamp(websiteKpis.lastLivePreviewUpdateAt)}`
  ),
  createMetricCard(
    "deleted-websites",
    "Deleted websites",
    websiteKpis.deletedWebsiteCount,
    "Website drafts removed from the standalone website workspace"
  ),
];

export const buildSurfacePerformanceCards = (websiteKpis) => ({
  [SURFACE_KPI_TAB_PREVIEW]: {
    title: "Preview surface performance",
    description:
      "Preview LCP is captured from the public preview route when it is opened on a mobile viewport.",
    metrics: [
      createMetricCard(
        "preview-site-lcp-mobile-p75",
        "site_lcp_mobile_p75",
        formatNullableDurationMs(websiteKpis.previewSiteLcpMobileP75),
        "75th percentile Largest Contentful Paint for preview visits on mobile."
      ),
    ],
  },
  [SURFACE_KPI_TAB_LIVE]: {
    title: "Live surface performance",
    description:
      "Live-site web-vitals remain pending until the published standalone website surface and routing are active.",
    metrics: [
      createMetricCard(
        "live-site-lcp-mobile-p75",
        "site_lcp_mobile_p75",
        formatNullableDurationMs(websiteKpis.liveSiteLcpMobileP75),
        "No live standalone site telemetry is being recorded yet."
      ),
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
