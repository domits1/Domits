export const WEBSITE_KPI_COUNT_FIELD_KEYS = Object.freeze([
  "currentDraftCount",
  "draftCreatedCount",
  "draftSaveCount",
  "buildStartedCount",
  "buildSucceededCount",
  "buildFailedCount",
  "buildAbandonedCount",
  "publicPreviewViewCount",
  "uniquePreviewedWebsiteCount",
  "livePreviewUpdateCount",
  "deletedWebsiteCount",
  "lastPublicPreviewAt",
  "lastLivePreviewUpdateAt",
]);

export const WEBSITE_KPI_NULLABLE_FIELD_KEYS = Object.freeze([
  "buildSuccessRate",
  "buildFailureRate",
  "buildAbandonmentRate",
  "timeToFirstPreviewP95",
  "previewSiteLcpMobileP75",
  "liveSiteLcpMobileP75",
  "timeToPublishP95",
  "costPerActiveSitePerMonth",
  "siteLcpMobileP75",
  "fallbackSubdomainAvailability",
  "quoteToChargeMismatchRate",
  "bookingApiErrorRate",
  "bookingFunnelCompletionRate",
  "customDomainSetupSuccessRate",
]);

const buildEmptyWebsiteKpis = () => ({
  ...Object.fromEntries(WEBSITE_KPI_COUNT_FIELD_KEYS.map((fieldKey) => [fieldKey, 0])),
  ...Object.fromEntries(WEBSITE_KPI_NULLABLE_FIELD_KEYS.map((fieldKey) => [fieldKey, null])),
  deletionReasonBreakdown: [],
});

export const EMPTY_WEBSITE_KPIS = Object.freeze(buildEmptyWebsiteKpis());
