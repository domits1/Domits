import React, { useEffect, useMemo, useRef, useState } from "react";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import { fetchWebsiteKpis } from "./services/websiteKpiService";
import { WebsiteKpiMetricCard, WebsiteKpiResearchCard } from "./WebsiteKpiCards";
import { WEBSITE_DRAFT_DELETE_REASONS } from "../websiteDeleteReasons";
import {
  buildResearchKpiCards,
  buildSurfacePerformanceCards,
  buildWebsiteMetricCards,
  EMPTY_WEBSITE_KPIS,
  SURFACE_KPI_TAB_OPTIONS,
  SURFACE_KPI_TAB_PREVIEW,
} from "./websiteKpiConfig";
import styles from "../WebsiteBuilderPage.module.scss";

const KPI_VIEW_TAB_OVERVIEW = "overview";
const KPI_VIEW_TAB_PERFORMANCE = "performance";
const KPI_VIEW_TAB_RESEARCH = "research";
const KPI_VIEW_TAB_DELETIONS = "deletions";

const KPI_VIEW_TAB_OPTIONS = Object.freeze([
  { id: KPI_VIEW_TAB_OVERVIEW, label: "Overview" },
  { id: KPI_VIEW_TAB_PERFORMANCE, label: "Performance" },
  { id: KPI_VIEW_TAB_RESEARCH, label: "Research" },
  { id: KPI_VIEW_TAB_DELETIONS, label: "Deletion reasons" },
]);
const WEBSITE_KPI_POLL_INTERVAL_MS = 60000;
const WEBSITE_KPI_HIGHLIGHT_DURATION_MS = 2200;
const formatWebsiteKpiSyncTime = (timestamp) =>
  new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(timestamp));

const createCardSignatureMap = (cards) =>
  new Map(cards.map((card) => [card.id, JSON.stringify({ value: card.value, meta: card.meta })]));

const collectChangedCardIds = (previousCards, nextCards) => {
  const previousCardMap = createCardSignatureMap(previousCards);
  return nextCards
    .filter((nextCard) => previousCardMap.get(nextCard.id) !== JSON.stringify({ value: nextCard.value, meta: nextCard.meta }))
    .map((nextCard) => nextCard.id);
};

const buildDeletionReasonRows = (deletionReasonBreakdown) => {
  const reasonCountMap = new Map(
    deletionReasonBreakdown.map((reasonEntry) => [reasonEntry.reason, reasonEntry.count])
  );
  const configuredRows = WEBSITE_DRAFT_DELETE_REASONS.map((reason) => ({
    reason,
    count: reasonCountMap.get(reason) || 0,
  }));
  const configuredReasons = new Set(WEBSITE_DRAFT_DELETE_REASONS);
  const extraRows = deletionReasonBreakdown
    .filter((reasonEntry) => !configuredReasons.has(reasonEntry.reason))
    .map((reasonEntry) => ({
      reason: reasonEntry.reason,
      count: reasonEntry.count,
    }));

  return [...configuredRows, ...extraRows];
};

const collectChangedDeletionReasonIds = (previousBreakdown, nextBreakdown) => {
  const previousReasonMap = new Map(
    buildDeletionReasonRows(previousBreakdown).map((reasonEntry) => [reasonEntry.reason, reasonEntry.count])
  );

  return buildDeletionReasonRows(nextBreakdown)
    .filter((reasonEntry) => previousReasonMap.get(reasonEntry.reason) !== reasonEntry.count)
    .map((reasonEntry) => reasonEntry.reason);
};

const collectChangedKpiIds = (previousWebsiteKpis, nextWebsiteKpis) => {
  const previousMetricCards = [
    ...buildWebsiteMetricCards(previousWebsiteKpis),
    ...Object.values(buildSurfacePerformanceCards(previousWebsiteKpis)).flatMap(
      (surfaceCardGroup) => surfaceCardGroup.metrics
    ),
  ];
  const nextMetricCards = [
    ...buildWebsiteMetricCards(nextWebsiteKpis),
    ...Object.values(buildSurfacePerformanceCards(nextWebsiteKpis)).flatMap(
      (surfaceCardGroup) => surfaceCardGroup.metrics
    ),
  ];
  const previousResearchCards = buildResearchKpiCards(previousWebsiteKpis).map((researchKpiCard) => ({
    id: researchKpiCard.id,
    value: researchKpiCard.value,
    meta: researchKpiCard.statusLabel,
  }));
  const nextResearchCards = buildResearchKpiCards(nextWebsiteKpis).map((researchKpiCard) => ({
    id: researchKpiCard.id,
    value: researchKpiCard.value,
    meta: researchKpiCard.statusLabel,
  }));

  return {
    metricIds: collectChangedCardIds(previousMetricCards, nextMetricCards),
    researchIds: collectChangedCardIds(previousResearchCards, nextResearchCards),
    deletionReasonIds: collectChangedDeletionReasonIds(
      previousWebsiteKpis.deletionReasonBreakdown,
      nextWebsiteKpis.deletionReasonBreakdown
    ),
  };
};

function WebsiteKpiDashboardPage() {
  const [websiteKpis, setWebsiteKpis] = useState(EMPTY_WEBSITE_KPIS);
  const [isLoadingWebsiteKpis, setIsLoadingWebsiteKpis] = useState(true);
  const [isRefreshingWebsiteKpis, setIsRefreshingWebsiteKpis] = useState(false);
  const [websiteKpisError, setWebsiteKpisError] = useState("");
  const [websiteKpisRefreshError, setWebsiteKpisRefreshError] = useState("");
  const [lastWebsiteKpiRefreshAt, setLastWebsiteKpiRefreshAt] = useState(0);
  const [surfaceKpiTab, setSurfaceKpiTab] = useState(SURFACE_KPI_TAB_PREVIEW);
  const [kpiViewTab, setKpiViewTab] = useState(KPI_VIEW_TAB_OVERVIEW);
  const [highlightedMetricIds, setHighlightedMetricIds] = useState([]);
  const [highlightedResearchKpiIds, setHighlightedResearchKpiIds] = useState([]);
  const [highlightedDeletionReasonIds, setHighlightedDeletionReasonIds] = useState([]);
  const hasLoadedWebsiteKpisRef = useRef(false);
  const websiteKpiRequestInFlightRef = useRef(false);
  const latestWebsiteKpisRef = useRef(EMPTY_WEBSITE_KPIS);
  const kpiHighlightTimeoutRef = useRef(null);

  const loadWebsiteKpis = async ({ background = false } = {}) => {
    if (websiteKpiRequestInFlightRef.current) {
      return;
    }

    websiteKpiRequestInFlightRef.current = true;

    if (!hasLoadedWebsiteKpisRef.current) {
      setIsLoadingWebsiteKpis(true);
      setWebsiteKpisError("");
    } else {
      setIsRefreshingWebsiteKpis(true);
      setWebsiteKpisRefreshError("");
    }

    try {
      const nextWebsiteKpis = await fetchWebsiteKpis();
      const previousWebsiteKpis = latestWebsiteKpisRef.current;
      const shouldAnimateChanges = hasLoadedWebsiteKpisRef.current;
      setWebsiteKpis(nextWebsiteKpis);
      latestWebsiteKpisRef.current = nextWebsiteKpis;
      setLastWebsiteKpiRefreshAt(Date.now());
      setWebsiteKpisError("");
      setWebsiteKpisRefreshError("");
      hasLoadedWebsiteKpisRef.current = true;

      if (shouldAnimateChanges) {
        const nextChangedKpiIds = collectChangedKpiIds(previousWebsiteKpis, nextWebsiteKpis);
        const hasChangedKpis =
          nextChangedKpiIds.metricIds.length > 0 ||
          nextChangedKpiIds.researchIds.length > 0 ||
          nextChangedKpiIds.deletionReasonIds.length > 0;

        if (hasChangedKpis) {
          setHighlightedMetricIds(nextChangedKpiIds.metricIds);
          setHighlightedResearchKpiIds(nextChangedKpiIds.researchIds);
          setHighlightedDeletionReasonIds(nextChangedKpiIds.deletionReasonIds);

          if (kpiHighlightTimeoutRef.current) {
            globalThis.clearTimeout(kpiHighlightTimeoutRef.current);
          }

          kpiHighlightTimeoutRef.current = globalThis.setTimeout(() => {
            setHighlightedMetricIds([]);
            setHighlightedResearchKpiIds([]);
            setHighlightedDeletionReasonIds([]);
            kpiHighlightTimeoutRef.current = null;
          }, WEBSITE_KPI_HIGHLIGHT_DURATION_MS);
        }
      }
    } catch (error) {
      const nextErrorMessage =
        error?.message || "We could not load the standalone website KPI overview.";
      if (!hasLoadedWebsiteKpisRef.current) {
        setWebsiteKpis(EMPTY_WEBSITE_KPIS);
        setWebsiteKpisError(nextErrorMessage);
      } else {
        setWebsiteKpisRefreshError(nextErrorMessage);
      }
    } finally {
      setIsLoadingWebsiteKpis(false);
      setIsRefreshingWebsiteKpis(false);
      websiteKpiRequestInFlightRef.current = false;
    }
  };

  useEffect(() => {
    void loadWebsiteKpis();
  }, []);

  useEffect(() => () => {
    if (kpiHighlightTimeoutRef.current) {
      globalThis.clearTimeout(kpiHighlightTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const intervalId = globalThis.setInterval(() => {
      if (globalThis.document?.visibilityState === "hidden") {
        return;
      }

      void loadWebsiteKpis({ background: true });
    }, WEBSITE_KPI_POLL_INTERVAL_MS);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, []);

  const metricCards = buildWebsiteMetricCards(websiteKpis);
  const surfacePerformanceCards = buildSurfacePerformanceCards(websiteKpis);
  const researchKpiCards = buildResearchKpiCards(websiteKpis);
  const deletionReasonRows = useMemo(
    () => buildDeletionReasonRows(websiteKpis.deletionReasonBreakdown),
    [websiteKpis.deletionReasonBreakdown]
  );

  const renderDeletionReasonContent = () => {
    if (isLoadingWebsiteKpis && !hasLoadedWebsiteKpisRef.current) {
      return (
        <div className={styles.stateCard}>
          <PulseBarsLoader message="Loading website deletion reasons..." />
        </div>
      );
    }

    return (
      <div className={styles.deletionReasonTableWrapper}>
        <table className={styles.deletionReasonTable}>
          <thead>
            <tr>
              <th scope="col">Reason</th>
              <th scope="col">Count</th>
            </tr>
          </thead>
          <tbody>
            {deletionReasonRows.map((reasonEntry) => (
            <tr key={reasonEntry.reason}>
                <td
                  className={
                    highlightedDeletionReasonIds.includes(reasonEntry.reason)
                      ? styles.deletionReasonRowUpdated
                      : undefined
                  }
                >
                  {reasonEntry.reason}
                </td>
                <td
                  className={
                    highlightedDeletionReasonIds.includes(reasonEntry.reason)
                      ? styles.deletionReasonRowUpdated
                      : undefined
                  }
                >
                  {reasonEntry.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderOverviewTabContent = () => (
    <div className={styles.kpiGrid}>
      {metricCards.map((metricCard) => (
        <WebsiteKpiMetricCard
          key={metricCard.id}
          title={metricCard.title}
          value={metricCard.value}
          meta={metricCard.meta}
          isLoading={isLoadingWebsiteKpis && !hasLoadedWebsiteKpisRef.current}
          isHighlighted={highlightedMetricIds.includes(metricCard.id)}
        />
      ))}
    </div>
  );

  const renderPerformanceTabContent = () => (
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
              isLoading={isLoadingWebsiteKpis && !hasLoadedWebsiteKpisRef.current}
              loadingMeta="Loading surface performance metrics..."
              isHighlighted={highlightedMetricIds.includes(surfaceMetric.id)}
            />
          ))}
        </div>
      </div>
    </article>
  );

  const renderResearchTabContent = () => (
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
            isLoading={isLoadingWebsiteKpis && !hasLoadedWebsiteKpisRef.current}
            isHighlighted={highlightedResearchKpiIds.includes(researchKpiCard.id)}
          />
        ))}
      </div>
    </article>
  );

  const renderDeletionTabContent = () => (
    <article className={styles.deletionReasonPanel}>
      <div className={styles.deletionReasonHeader}>
        <h3>Website deletion reasons</h3>
        <p>Counts are aggregated from the reasons selected in the standalone website delete flow.</p>
      </div>

      {renderDeletionReasonContent()}
    </article>
  );

  const renderSelectedKpiView = () => {
    switch (kpiViewTab) {
      case KPI_VIEW_TAB_PERFORMANCE:
        return renderPerformanceTabContent();
      case KPI_VIEW_TAB_RESEARCH:
        return renderResearchTabContent();
      case KPI_VIEW_TAB_DELETIONS:
        return renderDeletionTabContent();
      case KPI_VIEW_TAB_OVERVIEW:
      default:
        return renderOverviewTabContent();
    }
  };

  const syncStatusText = websiteKpisRefreshError
    ? websiteKpisRefreshError
    : isRefreshingWebsiteKpis
    ? "Syncing live KPI data..."
    : lastWebsiteKpiRefreshAt > 0
    ? `Live updates every 60 seconds. Last synced ${formatWebsiteKpiSyncTime(
        lastWebsiteKpiRefreshAt
      )}`
    : "Live updates start after the first KPI response.";

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
      renderSelectedKpiView()
    );
  };

  return (
    <main className="page-Host">
      <div className="page-Host-content">
        <section className={`${styles.websitePage} ${styles.websitePageWide}`.trim()}>
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

            <div className={styles.kpiToolbar}>
              <div className={styles.kpiToolbarPrimary}>
                <div className={styles.kpiViewTabRow} role="tablist" aria-label="Website KPI category tabs">
                  {KPI_VIEW_TAB_OPTIONS.map(({ id, label }) => {
                    const isActiveTab = kpiViewTab === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="tab"
                        aria-selected={isActiveTab}
                        className={`${styles.kpiViewTabButton} ${
                          isActiveTab ? styles.kpiViewTabButtonActive : ""
                        }`.trim()}
                        onClick={() => setKpiViewTab(id)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <p className={styles.kpiSyncMeta}>{syncStatusText}</p>
              </div>

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void loadWebsiteKpis({ background: true })}
                disabled={isLoadingWebsiteKpis || isRefreshingWebsiteKpis}
              >
                <RefreshOutlinedIcon fontSize="small" />
                {isLoadingWebsiteKpis
                  ? "Loading..."
                  : isRefreshingWebsiteKpis
                  ? "Syncing..."
                  : "Refresh data"}
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
