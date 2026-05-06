export { EMPTY_WEBSITE_KPIS } from "./websiteKpiFields";

export const SURFACE_KPI_TAB_PREVIEW = "preview";
export const SURFACE_KPI_TAB_LIVE = "live";
export const PERFORMANCE_VIEWPORT_TAB_MOBILE = "mobile";
export const PERFORMANCE_VIEWPORT_TAB_TABLET = "tablet";
export const PERFORMANCE_VIEWPORT_TAB_DESKTOP = "desktop";

export const SURFACE_KPI_TAB_OPTIONS = Object.freeze([
  { id: SURFACE_KPI_TAB_PREVIEW, label: "Preview" },
  { id: SURFACE_KPI_TAB_LIVE, label: "Live" },
]);

export const PERFORMANCE_VIEWPORT_TAB_OPTIONS = Object.freeze([
  { id: PERFORMANCE_VIEWPORT_TAB_MOBILE, label: "Mobile" },
  { id: PERFORMANCE_VIEWPORT_TAB_TABLET, label: "Tablet" },
  { id: PERFORMANCE_VIEWPORT_TAB_DESKTOP, label: "Desktop" },
]);

const KPI_EMPTY_VALUE = "No data yet";
const RESEARCH_KPI_EMPTY_VALUE = "Pending";
const KPI_STATUS_READY = "Instrumented";
const KPI_STATUS_PENDING = "Not instrumented yet";

const createFixedPrecisionFormatter = (suffix, scale = 1) => (value) => `${(value / scale).toFixed(2)}${suffix}`;
const createWholeMinutesFormatter = () => (value) => `${value.toFixed(1)} min`;
const createMinutesFromMsFormatter = () => (value) => `${(value / 60000).toFixed(1)} min`;
const createCurrencyFormatter = () => (value) => `EUR ${value.toFixed(2)}`;

const formatters = Object.freeze({
  percentage: createFixedPrecisionFormatter("%"),
  secondsFromMs: createFixedPrecisionFormatter(" s", 1000),
  seconds: createFixedPrecisionFormatter(" s"),
  minutes: createWholeMinutesFormatter(),
  minutesFromMs: createMinutesFromMsFormatter(),
  eur: createCurrencyFormatter(),
});

const createMetricCard = ({ id, title, value, meta, sampleLabel = "" }) => ({
  id,
  title,
  value,
  meta,
  sampleLabel,
});

const createMetricCardDefinition = (
  id,
  title,
  valueKey,
  meta,
  formatterKey = null,
  sampleLabel = ""
) => ({
  id,
  title,
  valueKey,
  meta,
  formatterKey,
  sampleLabel,
});

const createResearchKpiDefinition = (id, criteria, valueKey, formatterKey, note, sampleLabel = "") => ({
  id,
  criteria,
  valueKey,
  formatterKey,
  note,
  sampleLabel,
});

const createSurfaceMetricDefinition = (surface, viewport, description) =>
  createMetricCardDefinition(
    `${surface}-site-lcp-${viewport}-p75`,
    "site_lcp_p75",
    `${surface}SiteLcp${viewport.charAt(0).toUpperCase()}${viewport.slice(1)}P75`,
    description,
    "secondsFromMs",
    (websiteKpis) =>
      formatSampleLabel(
        websiteKpis[
          `${surface}SiteLcp${viewport.charAt(0).toUpperCase()}${viewport.slice(1)}SampleCount`
        ]
      )
  );

const formatKpiValue = (value, formatterKey = null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return KPI_EMPTY_VALUE;
  }

  if (!formatterKey) {
    return value;
  }

  return formatters[formatterKey](value);
};

const resolveMetricMeta = (meta, websiteKpis) =>
  typeof meta === "function" ? meta(websiteKpis) : meta;
const resolveMetricSampleLabel = (sampleLabel, websiteKpis) =>
  typeof sampleLabel === "function" ? sampleLabel(websiteKpis) : sampleLabel;

const formatSampleLabel = (count) => `n=${Number(count) || 0}`;

const buildMetricCardsFromDefinitions = (definitions, websiteKpis) =>
  definitions.map((definition) =>
    createMetricCard({
      id: definition.id,
      title: definition.title,
      value: formatKpiValue(websiteKpis[definition.valueKey], definition.formatterKey),
      meta: resolveMetricMeta(definition.meta, websiteKpis),
      sampleLabel: resolveMetricSampleLabel(definition.sampleLabel, websiteKpis),
    })
  );

const WEBSITE_METRIC_CARD_DEFINITIONS = Object.freeze([
  createMetricCardDefinition(
    "active-websites",
    "Active website drafts",
    "currentDraftCount",
    (websiteKpis) => `${websiteKpis.draftCreatedCount} drafts created across Domits`
  ),
  createMetricCardDefinition(
    "build-started",
    "Build attempts started",
    "buildStartedCount",
    "How often hosts pressed Build my website"
  ),
  createMetricCardDefinition(
    "build-succeeded",
    "Successful website builds",
    "buildSucceededCount",
    "Build attempts that reached preview and persisted a draft successfully"
  ),
  createMetricCardDefinition(
    "time-to-first-preview",
    "Time to first preview p95",
    "timeToFirstPreviewP95",
    "95th percentile from build click until preview rendered and usable",
    "secondsFromMs",
    (websiteKpis) => formatSampleLabel(websiteKpis.timeToFirstPreviewSampleCount)
  ),
  createMetricCardDefinition(
    "build-success-rate",
    "Build success rate",
    "buildSuccessRate",
    "Successful website builds divided by all recorded build starts",
    "percentage",
    (websiteKpis) => formatSampleLabel(websiteKpis.buildSuccessRateSampleCount)
  ),
  createMetricCardDefinition(
    "build-failure-rate",
    "Build failure rate",
    "buildFailureRate",
    "Build attempts that ended in a recorded failure",
    "percentage",
    (websiteKpis) => formatSampleLabel(websiteKpis.buildFailureRateSampleCount)
  ),
  createMetricCardDefinition(
    "build-abandonment-rate",
    "Build abandonment rate",
    "buildAbandonmentRate",
    (websiteKpis) =>
      `${websiteKpis.buildAbandonedCount} attempts passed the 10 minute threshold without success or failure`,
    "percentage",
    (websiteKpis) => formatSampleLabel(websiteKpis.buildAbandonmentRateSampleCount)
  ),
  createMetricCardDefinition(
    "draft-saves",
    "Draft saves",
    "draftSaveCount",
    "How often saved editor changes were recorded"
  ),
  createMetricCardDefinition(
    "preview-opens",
    "Preview link opens",
    "publicPreviewViewCount",
    (websiteKpis) => `Last preview opened: ${formatKpiTimestamp(websiteKpis.lastPublicPreviewAt)}`
  ),
  createMetricCardDefinition(
    "unique-previewed",
    "Unique sites previewed",
    "uniquePreviewedWebsiteCount",
    "Distinct website drafts opened through shared preview links"
  ),
  createMetricCardDefinition(
    "live-preview-updates",
    "Live preview updates",
    "livePreviewUpdateCount",
    (websiteKpis) =>
      `Last update pushed: ${formatKpiTimestamp(websiteKpis.lastLivePreviewUpdateAt)}`
  ),
  createMetricCardDefinition(
    "deleted-websites",
    "Deleted websites",
    "deletedWebsiteCount",
    "Website drafts removed from the standalone website workspace"
  ),
]);

const SURFACE_PERFORMANCE_DEFINITIONS = Object.freeze({
  [SURFACE_KPI_TAB_PREVIEW]: {
    title: "Preview surface performance",
    description:
      "Preview LCP is captured from the public preview route and segmented by viewport class.",
    viewportDefinitions: {
      [PERFORMANCE_VIEWPORT_TAB_MOBILE]: {
        description:
          "75th percentile Largest Contentful Paint for preview visits on mobile devices.",
        metricDefinitions: [
          createSurfaceMetricDefinition(
            "preview",
            PERFORMANCE_VIEWPORT_TAB_MOBILE,
            "75th percentile Largest Contentful Paint for preview visits on mobile devices."
          ),
        ],
      },
      [PERFORMANCE_VIEWPORT_TAB_TABLET]: {
        description:
          "75th percentile Largest Contentful Paint for preview visits on tablet-sized viewports.",
        metricDefinitions: [
          createSurfaceMetricDefinition(
            "preview",
            PERFORMANCE_VIEWPORT_TAB_TABLET,
            "75th percentile Largest Contentful Paint for preview visits on tablet-sized viewports."
          ),
        ],
      },
      [PERFORMANCE_VIEWPORT_TAB_DESKTOP]: {
        description:
          "75th percentile Largest Contentful Paint for preview visits on desktop-sized viewports.",
        metricDefinitions: [
          createSurfaceMetricDefinition(
            "preview",
            PERFORMANCE_VIEWPORT_TAB_DESKTOP,
            "75th percentile Largest Contentful Paint for preview visits on desktop-sized viewports."
          ),
        ],
      },
    },
  },
  [SURFACE_KPI_TAB_LIVE]: {
    title: "Live surface performance",
    description:
      "Live fallback-site LCP is captured from the published standalone website surface and segmented by viewport class.",
    viewportDefinitions: {
      [PERFORMANCE_VIEWPORT_TAB_MOBILE]: {
        description:
          "75th percentile Largest Contentful Paint for published fallback-site visits on mobile devices.",
        metricDefinitions: [
          createSurfaceMetricDefinition(
            "live",
            PERFORMANCE_VIEWPORT_TAB_MOBILE,
            "75th percentile Largest Contentful Paint for published fallback-site visits on mobile devices."
          ),
        ],
      },
      [PERFORMANCE_VIEWPORT_TAB_TABLET]: {
        description:
          "75th percentile Largest Contentful Paint for published fallback-site visits on tablet-sized viewports.",
        metricDefinitions: [
          createSurfaceMetricDefinition(
            "live",
            PERFORMANCE_VIEWPORT_TAB_TABLET,
            "75th percentile Largest Contentful Paint for published fallback-site visits on tablet-sized viewports."
          ),
        ],
      },
      [PERFORMANCE_VIEWPORT_TAB_DESKTOP]: {
        description:
          "75th percentile Largest Contentful Paint for published fallback-site visits on desktop-sized viewports.",
        metricDefinitions: [
          createSurfaceMetricDefinition(
            "live",
            PERFORMANCE_VIEWPORT_TAB_DESKTOP,
            "75th percentile Largest Contentful Paint for published fallback-site visits on desktop-sized viewports."
          ),
        ],
      },
    },
  },
});

const RESEARCH_KPI_DEFINITIONS = Object.freeze([
  createResearchKpiDefinition(
    "time_to_publish_p95",
    ["Scalability", "User experience"],
    "timeToPublishP95",
    "minutesFromMs",
    "Measured from publish request until the published site and fallback domain write complete.",
    (websiteKpis) => formatSampleLabel(websiteKpis.timeToPublishSampleCount)
  ),
  createResearchKpiDefinition(
    "cost_per_active_site_per_month",
    ["Scalability", "Cost"],
    "costPerActiveSitePerMonth",
    "eur",
    "Requires infrastructure cost allocation plus a real count of active published sites. Drafts and preview links are not enough for a defensible value."
  ),
  createResearchKpiDefinition(
    "fallback_subdomain_availability",
    ["Reliability"],
    "fallbackSubdomainAvailability",
    "percentage",
    "Current published fallback reachability rate based on published site state plus ACTIVE fallback-domain routing status. This is not synthetic uptime yet.",
    (websiteKpis) => formatSampleLabel(websiteKpis.fallbackSubdomainAvailabilitySampleCount)
  ),
  createResearchKpiDefinition(
    "booking_api_error_rate",
    ["Reliability", "Correctness"],
    "bookingApiErrorRate",
    "percentage",
    "Requires the standalone booking API path to be live and instrumented. This remains a v2 metric until direct booking flow is active."
  ),
  createResearchKpiDefinition(
    "quote_to_charge_mismatch_rate",
    ["Correctness"],
    "quoteToChargeMismatchRate",
    "percentage",
    "Requires quote issuance and final successful charge comparison. That data does not exist until checkout and payment instrumentation is in place."
  ),
  createResearchKpiDefinition(
    "booking_funnel_completion_rate",
    ["User experience"],
    "bookingFunnelCompletionRate",
    "percentage",
    "Requires end-to-end funnel events from quote to completed booking. Current standalone website analytics stop at draft and preview usage."
  ),
  createResearchKpiDefinition(
    "custom_domain_setup_success_rate",
    ["User experience"],
    "customDomainSetupSuccessRate",
    "percentage",
    "Requires custom-domain setup flow, verification states, and success/failure events. That domain workflow is not implemented yet."
  ),
]);

export const formatKpiTimestamp = (timestamp) => {
  const parsedValue = Number(timestamp);
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return KPI_EMPTY_VALUE;
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
    return KPI_EMPTY_VALUE;
  }
};

export const formatNullablePercentage = (value) => formatKpiValue(value, "percentage");
export const formatNullableDurationMs = (value) => formatKpiValue(value, "secondsFromMs");

export const buildWebsiteMetricCards = (websiteKpis) =>
  buildMetricCardsFromDefinitions(WEBSITE_METRIC_CARD_DEFINITIONS, websiteKpis);

export const buildSurfacePerformanceCards = (websiteKpis, viewportTab = PERFORMANCE_VIEWPORT_TAB_MOBILE) =>
  Object.fromEntries(
    Object.entries(SURFACE_PERFORMANCE_DEFINITIONS).map(([surfaceTab, definition]) => {
      const viewportDefinition =
        definition.viewportDefinitions[viewportTab] ||
        definition.viewportDefinitions[PERFORMANCE_VIEWPORT_TAB_MOBILE];

      return [
        surfaceTab,
        {
          title: definition.title,
          description: definition.description,
          viewportDescription: viewportDefinition.description,
          metrics: buildMetricCardsFromDefinitions(viewportDefinition.metricDefinitions, websiteKpis),
        },
      ];
    })
  );

export const buildResearchKpiCards = (websiteKpis) =>
  RESEARCH_KPI_DEFINITIONS.map((researchKpi) => {
    const rawValue = websiteKpis[researchKpi.valueKey];
    const isInstrumented = typeof rawValue === "number" && Number.isFinite(rawValue);

    return {
      ...researchKpi,
      isInstrumented,
      value: isInstrumented
        ? formatters[researchKpi.formatterKey](rawValue)
        : RESEARCH_KPI_EMPTY_VALUE,
      statusLabel: isInstrumented ? KPI_STATUS_READY : KPI_STATUS_PENDING,
      sampleLabel: isInstrumented
        ? resolveMetricSampleLabel(researchKpi.sampleLabel, websiteKpis)
        : "",
    };
  });
