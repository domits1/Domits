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
  deletionReasonBreakdown: [],
});

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

  const renderKpiContent = () => {
    if (isLoadingWebsiteKpis) {
      return (
        <div className={styles.stateCard}>
          <PulseBarsLoader message="Loading standalone website KPIs..." />
        </div>
      );
    }

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
              <p className={styles.kpiCardValue}>{metricCard.value}</p>
              <p className={styles.kpiCardMeta}>{metricCard.meta}</p>
            </article>
          ))}
        </div>

        <article className={styles.deletionReasonPanel}>
          <div className={styles.deletionReasonHeader}>
            <h3>Website deletion reasons</h3>
            <p>Counts are aggregated from the reasons selected in the standalone website delete flow.</p>
          </div>

          {websiteKpis.deletionReasonBreakdown.length > 0 ? (
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
              <button type="button" className={styles.secondaryButton} onClick={() => void loadWebsiteKpis()}>
                <RefreshOutlinedIcon fontSize="small" />
                Refresh data
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
