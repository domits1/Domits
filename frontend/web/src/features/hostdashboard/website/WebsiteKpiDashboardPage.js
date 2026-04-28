import React, { useEffect, useState } from "react";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import PulseBarsLoader from "../../../components/loaders/PulseBarsLoader";
import { fetchWebsiteKpis } from "./services/websiteKpiService";
import styles from "./WebsiteBuilderPage.module.scss";

const EMPTY_WEBSITE_KPIS = Object.freeze({
  currentDraftCount: 0,
  draftCreatedCount: 0,
  draftSaveCount: 0,
  publicPreviewViewCount: 0,
  uniquePreviewedWebsiteCount: 0,
  livePreviewUpdateCount: 0,
  deletedWebsiteCount: 0,
  lastPublicPreviewAt: 0,
  lastLivePreviewUpdateAt: 0,
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
      "Requires mobile web-vitals telemetry from the public standalone website surface. The host dashboard preview does not emit that measurement.",
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

const formatKpiTimestamp = (timestamp) => {
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

function WebsiteKpiDashboardPage() {
  const [websiteKpis, setWebsiteKpis] = useState(EMPTY_WEBSITE_KPIS);
  const [isLoadingWebsiteKpis, setIsLoadingWebsiteKpis] = useState(true);
  const [websiteKpisError, setWebsiteKpisError] = useState("");

  const loadWebsiteKpis = async () => {
    setIsLoadingWebsiteKpis(true);
    setWebsiteKpisError("");

    try {
      const nextWebsiteKpis = await fetchWebsiteKpis();
      setWebsiteKpis(nextWebsiteKpis);
    } catch (error) {
      setWebsiteKpis(EMPTY_WEBSITE_KPIS);
      setWebsiteKpisError(error?.message || "We could not load the standalone website KPI overview.");
    } finally {
      setIsLoadingWebsiteKpis(false);
    }
  };

  useEffect(() => {
    void loadWebsiteKpis();
  }, []);

  const metricCards = [
    {
      id: "active-websites",
      title: "Active website drafts",
      value: websiteKpis.currentDraftCount,
      meta: `${websiteKpis.draftCreatedCount} drafts created across Domits`,
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

  const researchKpiCards = RESEARCH_KPI_DEFINITIONS.map((researchKpi) => {
    const rawValue = websiteKpis[researchKpi.valueKey];
    const isInstrumented = typeof rawValue === "number" && Number.isFinite(rawValue);

    return {
      ...researchKpi,
      isInstrumented,
      value: isInstrumented ? researchKpi.formatter(rawValue) : researchKpi.emptyValue,
      statusLabel: isInstrumented ? "Instrumented" : "Not instrumented yet",
    };
  });

  const renderKpiContent = () => {
    if (websiteKpisError) {
      return (
        <div className={`${styles.stateCard} ${styles.errorState}`}>
          <p>{websiteKpisError}</p>
          <div className={styles.buttonRow}>
            <button type="button" className={styles.primaryButton} onClick={() => void loadWebsiteKpis()}>
              Try again
            </button>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className={styles.kpiGrid}>
          {metricCards.map((metricCard) => (
            <article key={metricCard.id} className={styles.kpiCard}>
              <p className={styles.kpiCardTitle}>{metricCard.title}</p>
              {isLoadingWebsiteKpis ? (
                <div className={styles.kpiCardLoader}>
                  <PulseBarsLoader inline message="" />
                </div>
              ) : (
                <p className={styles.kpiCardValue}>{metricCard.value}</p>
              )}
              <p className={styles.kpiCardMeta}>
                {isLoadingWebsiteKpis ? "Loading aggregated website activity..." : metricCard.meta}
              </p>
            </article>
          ))}
        </div>

        <article className={styles.researchKpiPanel}>
          <div className={styles.researchKpiHeader}>
            <h3>Research KPI set</h3>
            <p>
              These KPI names come directly from the research. The dashboard shows them already, but
              only metrics with real instrumentation should surface values.
            </p>
          </div>

          <div className={styles.researchKpiGrid}>
            {researchKpiCards.map((researchKpiCard) => (
              <article key={researchKpiCard.id} className={styles.researchKpiCard}>
                <div className={styles.researchKpiCardHeader}>
                  <p className={styles.researchKpiCardTitle}>{researchKpiCard.id}</p>
                  <span
                    className={`${styles.researchKpiStatusBadge} ${
                      isLoadingWebsiteKpis
                        ? styles.researchKpiStatusBadgePending
                        : researchKpiCard.isInstrumented
                        ? styles.researchKpiStatusBadgeReady
                        : styles.researchKpiStatusBadgePending
                    }`.trim()}
                  >
                    {isLoadingWebsiteKpis ? "Loading" : researchKpiCard.statusLabel}
                  </span>
                </div>
                {isLoadingWebsiteKpis ? (
                  <div className={styles.researchKpiCardLoader}>
                    <PulseBarsLoader inline message="" />
                  </div>
                ) : (
                  <p className={styles.researchKpiCardValue}>{researchKpiCard.value}</p>
                )}
                <div className={styles.researchKpiCriteriaRow}>
                  {researchKpiCard.criteria.map((criterion) => (
                    <span
                      key={`${researchKpiCard.id}-${criterion}`}
                      className={styles.researchKpiCriterionTag}
                    >
                      {criterion}
                    </span>
                  ))}
                </div>
                <p className={styles.researchKpiCardMeta}>
                  {isLoadingWebsiteKpis
                    ? "Loading KPI status and instrumentation availability..."
                    : researchKpiCard.note}
                </p>
              </article>
            ))}
          </div>
        </article>

        <article className={styles.deletionReasonPanel}>
          <div className={styles.deletionReasonHeader}>
            <h3>Website deletion reasons</h3>
            <p>Counts are aggregated from the reasons selected in the standalone website delete flow.</p>
          </div>

          {isLoadingWebsiteKpis ? (
            <div className={styles.stateCard}>
              <PulseBarsLoader message="Loading website deletion reasons..." />
            </div>
          ) : websiteKpis.deletionReasonBreakdown.length > 0 ? (
            <div className={styles.deletionReasonList}>
              {websiteKpis.deletionReasonBreakdown.map((reasonEntry) => (
                <div key={reasonEntry.reason} className={styles.deletionReasonRow}>
                  <span>{reasonEntry.reason}</span>
                  <strong>{reasonEntry.count}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.previewHelperText}>
              No website deletions with selected reasons have been recorded yet.
            </p>
          )}
        </article>
      </>
    );
  };

  return (
    <main className="page-Host">
      <div className="page-Host-content">
        <section className={styles.websitePage}>
          <div className={styles.heroCard}>
            <p className={styles.eyebrow}>Standalone website analytics</p>
            <h1 className={styles.heroTitle}>Direct Booking Website KPI dashboard</h1>
            <p className={styles.heroDescription}>
              This dashboard shows aggregated standalone website activity across Domits. It is intended
              for internal analysis of draft usage, preview behaviour, publishing behaviour, and deletion
              patterns.
            </p>
          </div>

          <section className={styles.selectorCard}>
            <div className={styles.selectorHeader}>
              <div className={styles.stepTitleRow}>
                <span className={styles.titleIconBadge} aria-hidden="true">
                  <InsightsOutlinedIcon className={styles.titleIcon} />
                </span>
                <h2>Website KPI overview</h2>
              </div>
              <p>
                Metrics on this page are global. They are not filtered to one host or one property, so
                the overview reflects overall standalone website usage across the platform.
              </p>
            </div>

            <div className={styles.buttonRow}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void loadWebsiteKpis()}
                disabled={isLoadingWebsiteKpis}
              >
                <RefreshOutlinedIcon fontSize="small" />
                {isLoadingWebsiteKpis ? "Loading..." : "Refresh data"}
              </button>
            </div>

            <section className={styles.kpiSection}>{renderKpiContent()}</section>
          </section>
        </section>
      </div>
    </main>
  );
}

export default WebsiteKpiDashboardPage;
