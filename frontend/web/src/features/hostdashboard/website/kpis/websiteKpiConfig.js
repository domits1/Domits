export { EMPTY_WEBSITE_KPIS } from "./websiteKpiFields";

export const PERFORMANCE_VIEWPORT_TAB_MOBILE = "mobile";
export const PERFORMANCE_VIEWPORT_TAB_TABLET = "tablet";
export const PERFORMANCE_VIEWPORT_TAB_DESKTOP = "desktop";

export const PERFORMANCE_VIEWPORT_TAB_OPTIONS = Object.freeze([
  { id: PERFORMANCE_VIEWPORT_TAB_MOBILE, label: "Mobile" },
  { id: PERFORMANCE_VIEWPORT_TAB_TABLET, label: "Tablet" },
  { id: PERFORMANCE_VIEWPORT_TAB_DESKTOP, label: "Desktop" },
]);

const KPI_EMPTY_VALUE = "No data yet";
const RESEARCH_KPI_EMPTY_VALUE = "Pending";
const KPI_STATUS_READY = "Instrumented";
const KPI_STATUS_PENDING = "Not instrumented yet";
const KPI_STATUS_PROXY = "Proxy metric";
const KPI_STATUS_NEEDS_CONFIG = "Needs config";
const KPI_DELTA_EPSILON = 0.0001;
const KPI_READINESS_STATE_INSTRUMENTED = "instrumented";
const KPI_READINESS_STATE_PENDING = "pending";
const KPI_READINESS_STATE_PROXY = "proxy";
const KPI_READINESS_STATE_NEEDS_CONFIG = "needs_config";

const createFixedPrecisionFormatter = (suffix, scale = 1) => (value) => `${(value / scale).toFixed(2)}${suffix}`;
const createWholeMinutesFormatter = () => (value) => `${value.toFixed(1)} min`;
const createMinutesFromMsFormatter = () => (value) => `${(value / 60000).toFixed(1)} min`;
const createAdaptiveDurationFromMsFormatter = () => (value) => {
  if (!Number.isFinite(value)) {
    return KPI_EMPTY_VALUE;
  }

  if (value < 60000) {
    return `${(value / 1000).toFixed(2)} s`;
  }

  return `${(value / 60000).toFixed(1)} min`;
};
const createCurrencyFormatter = () => (value) => `EUR ${value.toFixed(2)}`;

const formatters = Object.freeze({
  percentage: createFixedPrecisionFormatter("%"),
  secondsFromMs: createFixedPrecisionFormatter(" s", 1000),
  seconds: createFixedPrecisionFormatter(" s"),
  minutes: createWholeMinutesFormatter(),
  minutesFromMs: createMinutesFromMsFormatter(),
  durationFromMs: createAdaptiveDurationFromMsFormatter(),
  eur: createCurrencyFormatter(),
});

const formatSignedValue = (rawValue, formatter) => {
  const sign = rawValue > 0 ? "+" : "-";
  return `${sign}${formatter(Math.abs(rawValue))}`;
};

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

const createResearchKpiDefinition = (
  id,
  criteria,
  valueKey,
  formatterKey,
  note,
  sampleLabel = "",
  sampleCountKey = ""
) => ({
  id,
  criteria,
  valueKey,
  formatterKey,
  note,
  sampleLabel,
  sampleCountKey,
});

const createPerformanceMetricDefinition = (viewport, description) =>
  createMetricCardDefinition(
    `site-lcp-${viewport}-p75`,
    "site_lcp_p75",
    `siteLcp${viewport.charAt(0).toUpperCase()}${viewport.slice(1)}P75`,
    description,
    "secondsFromMs",
    (websiteKpis) =>
      formatSampleLabel(
        websiteKpis[`siteLcp${viewport.charAt(0).toUpperCase()}${viewport.slice(1)}SampleCount`]
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

const formatNumericDeltaValue = (rawValue) => {
  const sign = rawValue > 0 ? "+" : "-";
  const absoluteValue = Math.abs(rawValue);
  if (Number.isInteger(absoluteValue)) {
    return `${sign}${absoluteValue}`;
  }

  return `${sign}${absoluteValue.toFixed(2)}`;
};

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

const buildDeltaMapFromDefinitions = (definitions, previousWebsiteKpis, nextWebsiteKpis) =>
  Object.fromEntries(
    definitions
      .map((definition) => {
        const previousValue = previousWebsiteKpis[definition.valueKey];
        const nextValue = nextWebsiteKpis[definition.valueKey];

        if (!Number.isFinite(previousValue) || !Number.isFinite(nextValue)) {
          return null;
        }

        const rawDelta = nextValue - previousValue;
        if (Math.abs(rawDelta) < KPI_DELTA_EPSILON) {
          return null;
        }

        if (!definition.formatterKey) {
          return [definition.id, formatNumericDeltaValue(rawDelta)];
        }

        switch (definition.formatterKey) {
          case "percentage":
            return [definition.id, formatSignedValue(rawDelta, formatters.percentage)];
          case "secondsFromMs":
            return [definition.id, formatSignedValue(rawDelta, formatters.secondsFromMs)];
          case "seconds":
            return [definition.id, formatSignedValue(rawDelta, formatters.seconds)];
          case "minutes":
            return [definition.id, formatSignedValue(rawDelta, formatters.minutes)];
          case "minutesFromMs":
            return [definition.id, formatSignedValue(rawDelta, formatters.minutesFromMs)];
          case "durationFromMs":
            return [definition.id, formatSignedValue(rawDelta, formatters.durationFromMs)];
          case "eur":
            return [definition.id, formatSignedValue(rawDelta, formatters.eur)];
          default:
            return [definition.id, formatNumericDeltaValue(rawDelta)];
        }
      })
      .filter(Boolean)
  );

const WEBSITE_METRIC_CARD_DEFINITIONS = Object.freeze([
  createMetricCardDefinition(
    "draft-created",
    "Website drafts created",
    "draftCreatedCount",
    "How many direct booking website drafts have been created across Domits"
  ),
  createMetricCardDefinition(
    "active-websites",
    "Active website drafts",
    "currentDraftCount",
    "Saved website drafts that still remain active in the workspace"
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
    "Successful website builds divided by all recorded build starts. Abandonment is tracked separately.",
    "percentage",
    (websiteKpis) => formatSampleLabel(websiteKpis.buildSuccessRateSampleCount)
  ),
  createMetricCardDefinition(
    "build-failure-rate",
    "Build failure rate",
    "buildFailureRate",
    "Recorded build failures divided by all recorded build starts. Abandonment is tracked separately.",
    "percentage",
    (websiteKpis) => formatSampleLabel(websiteKpis.buildFailureRateSampleCount)
  ),
  createMetricCardDefinition(
    "build-abandonment-rate",
    "Build abandonment rate",
    "buildAbandonmentRate",
    (websiteKpis) =>
      `${websiteKpis.buildAbandonedCount} builder flows were abandoned separately from explicit build success or failure`,
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
    "unique-live-sites",
    "Unique live sites opened",
    "uniqueLiveSiteCount",
    "Distinct websites opened through the Domits live link across preview-era and live-site history"
  ),
  createMetricCardDefinition(
    "live-site-opens",
    "Live site opens",
    "liveSiteOpenCount",
    (websiteKpis) => `Last live site opened: ${formatKpiTimestamp(websiteKpis.lastLiveSiteOpenAt)}`
  ),
  createMetricCardDefinition(
    "live-site-updates",
    "Live site updates",
    "liveSiteUpdateCount",
    (websiteKpis) =>
      `Last live site update: ${formatKpiTimestamp(websiteKpis.lastLiveSiteUpdateAt)}`
  ),
  createMetricCardDefinition(
    "deleted-websites",
    "Deleted websites",
    "deletedWebsiteCount",
    "Website drafts removed from the direct booking website workspace"
  ),
]);

const WEBSITE_METRIC_GROUP_DEFINITIONS = Object.freeze([
  {
    id: "usage-in-practice",
    title: "Usage in practice",
    description:
      "These KPIs show whether hosts actually use the feature as an ongoing editor instead of only as a one-time builder.",
    metricCardIds: ["draft-created", "active-websites", "draft-saves"],
  },
  {
    id: "builder-funnel",
    title: "Builder and preview funnel",
    description:
      "These KPIs show how often hosts start the builder, reach a saved preview, and how reliable that flow remains.",
    metricCardIds: [
      "build-started",
      "build-succeeded",
      "time-to-first-preview",
      "build-success-rate",
      "build-failure-rate",
      "build-abandonment-rate",
    ],
  },
  {
    id: "live-site-activity",
    title: "Live-site activity",
    description:
      "These KPIs show whether published websites continue to be opened, updated, and maintained over time.",
    metricCardIds: ["unique-live-sites", "live-site-opens", "live-site-updates", "deleted-websites"],
  },
]);

const PERFORMANCE_DEFINITIONS = Object.freeze({
  title: "Website performance",
  description:
    "Performance combines historical preview-route telemetry and current live-site telemetry into one viewport-specific KPI series.",
  viewportDefinitions: {
    [PERFORMANCE_VIEWPORT_TAB_MOBILE]: {
      description:
        "75th percentile Largest Contentful Paint for mobile visits across the earlier preview route and the current live-site runtime.",
      metricDefinitions: [
        createPerformanceMetricDefinition(
          PERFORMANCE_VIEWPORT_TAB_MOBILE,
          "75th percentile Largest Contentful Paint for mobile visits across preview-era and live-site history."
        ),
      ],
    },
    [PERFORMANCE_VIEWPORT_TAB_TABLET]: {
      description:
        "75th percentile Largest Contentful Paint for tablet-sized visits across the earlier preview route and the current live-site runtime.",
      metricDefinitions: [
        createPerformanceMetricDefinition(
          PERFORMANCE_VIEWPORT_TAB_TABLET,
          "75th percentile Largest Contentful Paint for tablet-sized visits across preview-era and live-site history."
        ),
      ],
    },
    [PERFORMANCE_VIEWPORT_TAB_DESKTOP]: {
      description:
        "75th percentile Largest Contentful Paint for desktop-sized visits across the earlier preview route and the current live-site runtime.",
      metricDefinitions: [
        createPerformanceMetricDefinition(
          PERFORMANCE_VIEWPORT_TAB_DESKTOP,
          "75th percentile Largest Contentful Paint for desktop-sized visits across preview-era and live-site history."
        ),
      ],
    },
  },
});

const RESEARCH_KPI_DEFINITIONS = Object.freeze([
  createResearchKpiDefinition(
    "time_to_publish_p95",
    ["Scalability", "User experience"],
    "timeToPublishP95",
    "durationFromMs",
    "Measured from publish request until the live site and Domits live link write complete. This reflects backend publish latency, not DNS propagation.",
    (websiteKpis) => formatSampleLabel(websiteKpis.timeToPublishSampleCount),
    "timeToPublishSampleCount"
  ),
  createResearchKpiDefinition(
    "cost_per_active_site_per_month",
    ["Scalability", "Cost"],
    "costPerActiveSitePerMonth",
    "eur",
    "Calculated from configured monthly direct-booking-website cost inputs, active published site count, and recent website usage events. This is a usage-weighted operating-cost proxy, not an AWS billing API feed.",
    (websiteKpis) => formatSampleLabel(websiteKpis.costPerActiveSitePerMonthSampleCount),
    "costPerActiveSitePerMonthSampleCount"
  ),
  createResearchKpiDefinition(
    "fallback_subdomain_availability",
    ["Reliability"],
    "fallbackSubdomainAvailability",
    "percentage",
    "Current published live-link reachability rate based on published site state plus ACTIVE Domits link routing status. This is not synthetic uptime yet.",
    (websiteKpis) => formatSampleLabel(websiteKpis.fallbackSubdomainAvailabilitySampleCount),
    "fallbackSubdomainAvailabilitySampleCount"
  ),
  createResearchKpiDefinition(
    "booking_api_error_rate",
    ["Reliability", "Correctness"],
    "bookingApiErrorRate",
    "percentage",
    "Requires the direct booking website booking API path to be live and instrumented. This remains a v2 metric until direct booking flow is active."
  ),
  createResearchKpiDefinition(
    "quote_to_charge_mismatch_rate",
    ["Correctness"],
    "quoteToChargeMismatchRate",
    "percentage",
    "Current proxy compares the published live-site room rate snapshot against the current PMS base room rate. A true quote-to-charge comparison still requires direct booking website quote, checkout, and payment instrumentation.",
    (websiteKpis) => formatSampleLabel(websiteKpis.quoteToChargeMismatchSampleCount),
    "quoteToChargeMismatchSampleCount"
  ),
  createResearchKpiDefinition(
    "booking_funnel_completion_rate",
    ["User experience"],
    "bookingFunnelCompletionRate",
    "percentage",
    "Requires end-to-end funnel events from quote to completed booking. Current direct booking website analytics stop at draft and preview usage."
  ),
  createResearchKpiDefinition(
    "custom_domain_setup_success_rate",
    ["User experience"],
    "customDomainSetupSuccessRate",
    "percentage",
    "Requires custom-domain setup flow, verification states, and success/failure events. That domain workflow is not implemented yet."
  ),
]);

const RESEARCH_KPI_NOTE_SUFFIX_BY_STATE = Object.freeze({
  cost_per_active_site_per_month: {
    [KPI_READINESS_STATE_NEEDS_CONFIG]:
      " Set the DIRECT_BOOKING_WEBSITE_MONTHLY_* and DIRECT_BOOKING_WEBSITE_COST_* env inputs for this environment to activate this KPI.",
  },
  fallback_subdomain_availability: {
    [KPI_READINESS_STATE_NEEDS_CONFIG]:
      " Set DIRECT_BOOKING_WEBSITE_FALLBACK_ROUTING_ACTIVE=true once direct.domits.com routing is active for this environment.",
  },
});

const RESEARCH_KPI_STATUS_LABEL_BY_STATE = Object.freeze({
  [KPI_READINESS_STATE_INSTRUMENTED]: KPI_STATUS_READY,
  [KPI_READINESS_STATE_PENDING]: KPI_STATUS_PENDING,
  [KPI_READINESS_STATE_PROXY]: KPI_STATUS_PROXY,
  [KPI_READINESS_STATE_NEEDS_CONFIG]: KPI_STATUS_NEEDS_CONFIG,
});

const RESEARCH_KPI_STATUS_TONE_BY_STATE = Object.freeze({
  [KPI_READINESS_STATE_INSTRUMENTED]: "ready",
  [KPI_READINESS_STATE_PENDING]: "pending",
  [KPI_READINESS_STATE_PROXY]: "proxy",
  [KPI_READINESS_STATE_NEEDS_CONFIG]: "warning",
});

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

export const buildWebsiteMetricGroups = (websiteKpis) => {
  const metricCards = buildWebsiteMetricCards(websiteKpis);
  const metricCardMap = new Map(metricCards.map((metricCard) => [metricCard.id, metricCard]));

  return WEBSITE_METRIC_GROUP_DEFINITIONS.map((groupDefinition) => ({
    ...groupDefinition,
    metricCards: groupDefinition.metricCardIds
      .map((metricCardId) => metricCardMap.get(metricCardId))
      .filter(Boolean),
  }));
};

export const buildWebsiteMetricDeltaMap = (previousWebsiteKpis, nextWebsiteKpis) =>
  buildDeltaMapFromDefinitions(
    WEBSITE_METRIC_CARD_DEFINITIONS,
    previousWebsiteKpis,
    nextWebsiteKpis
  );

export const buildPerformanceCards = (websiteKpis, viewportTab = PERFORMANCE_VIEWPORT_TAB_MOBILE) => {
  const viewportDefinition =
    PERFORMANCE_DEFINITIONS.viewportDefinitions[viewportTab] ||
    PERFORMANCE_DEFINITIONS.viewportDefinitions[PERFORMANCE_VIEWPORT_TAB_MOBILE];

  return {
    title: PERFORMANCE_DEFINITIONS.title,
    description: PERFORMANCE_DEFINITIONS.description,
    viewportDescription: viewportDefinition.description,
    metrics: buildMetricCardsFromDefinitions(viewportDefinition.metricDefinitions, websiteKpis),
  };
};

export const buildPerformanceMetricDeltaMap = (previousWebsiteKpis, nextWebsiteKpis) =>
  buildDeltaMapFromDefinitions(
    PERFORMANCE_VIEWPORT_TAB_OPTIONS.flatMap(({ id }) => {
      const viewportDefinition = PERFORMANCE_DEFINITIONS.viewportDefinitions[id];
      return viewportDefinition ? viewportDefinition.metricDefinitions : [];
    }),
    previousWebsiteKpis,
    nextWebsiteKpis
  );

const resolveResearchKpiValue = ({
  hasNumericValue,
  rawValue,
  formatterKey,
  hasSamples,
  readinessState,
}) => {
  if (hasNumericValue) {
    return formatters[formatterKey](rawValue);
  }

  if (hasSamples) {
    return "No valid samples";
  }

  if (readinessState === KPI_READINESS_STATE_NEEDS_CONFIG) {
    return "Config required";
  }

  if (
    readinessState === KPI_READINESS_STATE_INSTRUMENTED ||
    readinessState === KPI_READINESS_STATE_PROXY
  ) {
    return KPI_EMPTY_VALUE;
  }

  return RESEARCH_KPI_EMPTY_VALUE;
};

const resolveResearchKpiReadinessState = ({ researchKpiId, websiteKpis, hasNumericValue, hasSamples }) => {
  const explicitState = String(websiteKpis?.kpiReadiness?.[researchKpiId]?.state || "")
    .trim()
    .toLowerCase();
  if (explicitState) {
    return explicitState;
  }

  return hasNumericValue || hasSamples
    ? KPI_READINESS_STATE_INSTRUMENTED
    : KPI_READINESS_STATE_PENDING;
};

const resolveResearchKpiNote = ({ researchKpi, readinessState }) => {
  const noteSuffix = RESEARCH_KPI_NOTE_SUFFIX_BY_STATE[researchKpi.id]?.[readinessState] || "";
  return `${researchKpi.note}${noteSuffix}`;
};

export const buildResearchKpiCards = (websiteKpis) =>
  RESEARCH_KPI_DEFINITIONS.map((researchKpi) => {
    const rawValue = websiteKpis[researchKpi.valueKey];
    const sampleCount = Number(websiteKpis[researchKpi.sampleCountKey] || 0);
    const hasSamples = Number.isFinite(sampleCount) && sampleCount > 0;
    const hasNumericValue = typeof rawValue === "number" && Number.isFinite(rawValue);
    const readinessState = resolveResearchKpiReadinessState({
      researchKpiId: researchKpi.id,
      websiteKpis,
      hasNumericValue,
      hasSamples,
    });
    const isInstrumented = readinessState === KPI_READINESS_STATE_INSTRUMENTED;

    return {
      ...researchKpi,
      isInstrumented,
      statusTone: RESEARCH_KPI_STATUS_TONE_BY_STATE[readinessState] || "pending",
      value: resolveResearchKpiValue({
        hasNumericValue,
        rawValue,
        formatterKey: researchKpi.formatterKey,
        hasSamples,
        readinessState,
      }),
      statusLabel: RESEARCH_KPI_STATUS_LABEL_BY_STATE[readinessState] || KPI_STATUS_PENDING,
      sampleLabel: hasSamples
        ? resolveMetricSampleLabel(researchKpi.sampleLabel, websiteKpis)
        : "",
      note: resolveResearchKpiNote({
        researchKpi,
        readinessState,
      }),
    };
  });

export const buildResearchKpiDeltaMap = (previousWebsiteKpis, nextWebsiteKpis) =>
  buildDeltaMapFromDefinitions(
    RESEARCH_KPI_DEFINITIONS,
    previousWebsiteKpis,
    nextWebsiteKpis
  );
