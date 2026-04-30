import React, { useEffect, useState } from "react";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import { fetchWebsiteKpis } from "./services/websiteKpiService";
import { WebsiteKpiMetricCard, WebsiteKpiResearchCard } from "./WebsiteKpiCards";
import {
  buildResearchKpiCards,
  buildSurfacePerformanceCards,
  buildWebsiteMetricCards,
  EMPTY_WEBSITE_KPIS,
  SURFACE_KPI_TAB_LIVE,
  SURFACE_KPI_TAB_OPTIONS,
  SURFACE_KPI_TAB_PREVIEW,
} from "./websiteKpiConfig";
import styles from "../WebsiteBuilderPage.module.scss";

function WebsiteKpiDashboardPage() {
  const [websiteKpis, setWebsiteKpis] = useState(EMPTY_WEBSITE_KPIS);
  const [isLoadingWebsiteKpis, setIsLoadingWebsiteKpis] = useState(true);
  const [websiteKpisError, setWebsiteKpisError] = useState("");
  const [surfaceKpiTab, setSurfaceKpiTab] = useState(SURFACE_KPI_TAB_PREVIEW);

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

  const metricCards = buildWebsiteMetricCards(websiteKpis);
  const surfacePerformanceCards = buildSurfacePerformanceCards(websiteKpis);
  const researchKpiCards = buildResearchKpiCards(websiteKpis);

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
            <WebsiteKpiMetricCard
              key={metricCard.id}
              title={metricCard.title}
              value={metricCard.value}
              meta={metricCard.meta}
              isLoading={isLoadingWebsiteKpis}
            />
          ))}
        </div>

        <article className={styles.surfaceKpiPanel}>
          <div className={styles.surfaceKpiHeader}>
            <div>
              <h3>{surfacePerformanceCards[surfaceKpiTab].title}</h3>
              <p>Performance KPIs are separated by surface because preview and live do not share the same runtime path.</p>
            </div>

            <div className={styles.surfaceKpiTabRow} role="tablist" aria-label="Website surface KPI tabs">
              {SURFACE_KPI_TAB_OPTIONS.map(({ id, label }) => {
                const surfaceTab = id;
                const isActiveTab = surfaceKpiTab === surfaceTab;
                return (
                  <button
                    key={surfaceTab}
                    type="button"
                    role="tab"
                    aria-selected={isActiveTab}
                    className={`${styles.surfaceKpiTabButton} ${
                      isActiveTab ? styles.surfaceKpiTabButtonActive : ""
                    }`.trim()}
                    onClick={() => setSurfaceKpiTab(surfaceTab)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.surfaceKpiBody}>
            <p className={styles.surfaceKpiDescription}>
              {surfacePerformanceCards[surfaceKpiTab].description}
            </p>
            <div className={styles.surfaceKpiGrid}>
              {surfacePerformanceCards[surfaceKpiTab].metrics.map((surfaceMetric) => (
                <WebsiteKpiMetricCard
                  key={surfaceMetric.id}
                  title={surfaceMetric.title}
                  value={surfaceMetric.value}
                  meta={surfaceMetric.meta}
                  isLoading={isLoadingWebsiteKpis}
                  loadingMeta="Loading surface performance metrics..."
                />
              ))}
            </div>
          </div>
        </article>

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
              <WebsiteKpiResearchCard
                key={researchKpiCard.id}
                researchKpiCard={researchKpiCard}
                isLoading={isLoadingWebsiteKpis}
              />
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
