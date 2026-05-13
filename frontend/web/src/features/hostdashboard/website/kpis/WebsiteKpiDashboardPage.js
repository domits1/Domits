import React, { useEffect, useMemo, useRef, useState } from "react";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import { fetchWebsiteKpis } from "./services/websiteKpiService";
import { WebsiteKpiMetricCard, WebsiteKpiResearchCard } from "./WebsiteKpiCards";
import { WEBSITE_DRAFT_DELETE_REASONS } from "../websiteDeleteReasons";
import {
  buildResearchKpiCards,
  buildResearchKpiDeltaMap,
  buildPerformanceCards,
  buildPerformanceMetricDeltaMap,
  buildWebsiteMetricCards,
  buildWebsiteMetricDeltaMap,
  EMPTY_WEBSITE_KPIS,
  PERFORMANCE_VIEWPORT_TAB_MOBILE,
  PERFORMANCE_VIEWPORT_TAB_OPTIONS,
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

const getSyncStatusText = ({
  websiteKpisRefreshError,
  isRefreshingWebsiteKpis,
  lastWebsiteKpiRefreshAt,
}) => {
  if (websiteKpisRefreshError) {
    return websiteKpisRefreshError;
  }

  if (isRefreshingWebsiteKpis) {
    return "Syncing live KPI data...";
  }

  if (lastWebsiteKpiRefreshAt > 0) {
    return `Live updates every 60 seconds. Last synced ${formatWebsiteKpiSyncTime(
      lastWebsiteKpiRefreshAt
    )}`;
  }

  return "Live updates start after the first KPI response.";
};

const getRefreshButtonLabel = ({ isLoadingWebsiteKpis, isRefreshingWebsiteKpis }) => {
  if (isLoadingWebsiteKpis) {
    return "Loading...";
  }

  if (isRefreshingWebsiteKpis) {
    return "Syncing...";
  }

  return "Refresh data";
};

const createCardSignatureMap = (cards) =>
  new Map(
    cards.map((card) => [
      card.id,
      JSON.stringify({ value: card.value, meta: card.meta, sampleLabel: card.sampleLabel || "" }),
    ])
  );

const collectChangedCardIds = (previousCards, nextCards) => {
  const previousCardMap = createCardSignatureMap(previousCards);
  return nextCards
    .filter(
      (nextCard) =>
        previousCardMap.get(nextCard.id) !==
        JSON.stringify({
          value: nextCard.value,
          meta: nextCard.meta,
          sampleLabel: nextCard.sampleLabel || "",
        })
    )
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
  const previousSurfaceCards = PERFORMANCE_VIEWPORT_TAB_OPTIONS.flatMap(({ id }) =>
    buildPerformanceCards(previousWebsiteKpis, id).metrics
  );
  const nextSurfaceCards = PERFORMANCE_VIEWPORT_TAB_OPTIONS.flatMap(({ id }) =>
    buildPerformanceCards(nextWebsiteKpis, id).metrics
  );
  const previousMetricCards = [
    ...buildWebsiteMetricCards(previousWebsiteKpis),
    ...previousSurfaceCards,
  ];
  const nextMetricCards = [
    ...buildWebsiteMetricCards(nextWebsiteKpis),
    ...nextSurfaceCards,
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
  const [performanceViewportTab, setPerformanceViewportTab] = useState(PERFORMANCE_VIEWPORT_TAB_MOBILE);
  const [kpiViewTab, setKpiViewTab] = useState(KPI_VIEW_TAB_OVERVIEW);
  const [highlightedMetricIds, setHighlightedMetricIds] = useState([]);
  const [metricDeltaMap, setMetricDeltaMap] = useState({});
  const [highlightedResearchKpiIds, setHighlightedResearchKpiIds] = useState([]);
  const [researchKpiDeltaMap, setResearchKpiDeltaMap] = useState({});
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
    const isInitialLoad = hasLoadedWebsiteKpisRef.current === false;

    if (isInitialLoad) {
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
          const nextMetricDeltaMap = {
            ...buildWebsiteMetricDeltaMap(previousWebsiteKpis, nextWebsiteKpis),
            ...buildPerformanceMetricDeltaMap(previousWebsiteKpis, nextWebsiteKpis),
          };
          const nextResearchKpiDeltaMap = buildResearchKpiDeltaMap(
            previousWebsiteKpis,
            nextWebsiteKpis
          );

          setHighlightedMetricIds(nextChangedKpiIds.metricIds);
          setMetricDeltaMap(nextMetricDeltaMap);
          setHighlightedResearchKpiIds(nextChangedKpiIds.researchIds);
          setResearchKpiDeltaMap(nextResearchKpiDeltaMap);
          setHighlightedDeletionReasonIds(nextChangedKpiIds.deletionReasonIds);

          if (kpiHighlightTimeoutRef.current) {
            globalThis.clearTimeout(kpiHighlightTimeoutRef.current);
          }

          kpiHighlightTimeoutRef.current = globalThis.setTimeout(() => {
            setHighlightedMetricIds([]);
            setMetricDeltaMap({});
            setHighlightedResearchKpiIds([]);
            setResearchKpiDeltaMap({});
            setHighlightedDeletionReasonIds([]);
            kpiHighlightTimeoutRef.current = null;
          }, WEBSITE_KPI_HIGHLIGHT_DURATION_MS);
        }
      }
    } catch (error) {
      const nextErrorMessage =
        error?.message || "We could not load the standalone website KPI overview.";
      const isInitialLoadError = hasLoadedWebsiteKpisRef.current === false;

      if (isInitialLoadError) {
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
  const performanceCards = buildPerformanceCards(websiteKpis, performanceViewportTab);
  const researchKpiCards = buildResearchKpiCards(websiteKpis);
  const deletionReasonRows = useMemo(
    () => buildDeletionReasonRows(websiteKpis.deletionReasonBreakdown),
    [websiteKpis.deletionReasonBreakdown]
  );
  const isInitialKpiLoad = isLoadingWebsiteKpis && hasLoadedWebsiteKpisRef.current === false;
  const syncStatusText = getSyncStatusText({
    websiteKpisRefreshError,
    isRefreshingWebsiteKpis,
    lastWebsiteKpiRefreshAt,
  });
  const refreshButtonLabel = getRefreshButtonLabel({
    isLoadingWebsiteKpis,
    isRefreshingWebsiteKpis,
  });

  const renderDeletionReasonContent = () => {
    if (isInitialKpiLoad) {
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
          isLoading={isInitialKpiLoad}
          isHighlighted={highlightedMetricIds.includes(metricCard.id)}
          sampleLabel={metricCard.sampleLabel}
          deltaLabel={metricDeltaMap[metricCard.id] || ""}
        />
      ))}
    </div>
  );

  const renderPerformanceTabContent = () => (
    <article className={styles.surfaceKpiPanel}>
      <div className={styles.surfaceKpiHeader}>
        <div>
          <h3>{performanceCards.title}</h3>
          <p>{performanceCards.description}</p>
        </div>
      </div>

      <div className={styles.surfaceKpiBody}>
        <div className={styles.surfaceKpiViewportSection}>
          <div className={styles.surfaceKpiTabRow} role="tablist" aria-label="Website viewport KPI tabs">
            {PERFORMANCE_VIEWPORT_TAB_OPTIONS.map(({ id, label }) => {
              const isActiveTab = performanceViewportTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={isActiveTab}
                  className={`${styles.surfaceKpiTabButton} ${
                    isActiveTab ? styles.surfaceKpiTabButtonActive : ""
                  }`.trim()}
                  onClick={() => setPerformanceViewportTab(id)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <p className={styles.surfaceKpiDescription}>
          {performanceCards.viewportDescription}
        </p>
        <div className={styles.surfaceKpiGrid}>
          {performanceCards.metrics.map((surfaceMetric) => (
            <WebsiteKpiMetricCard
              key={surfaceMetric.id}
              title={surfaceMetric.title}
              value={surfaceMetric.value}
              meta={surfaceMetric.meta}
              isLoading={isInitialKpiLoad}
              loadingMeta="Loading surface performance metrics..."
              isHighlighted={highlightedMetricIds.includes(surfaceMetric.id)}
              sampleLabel={surfaceMetric.sampleLabel}
              deltaLabel={metricDeltaMap[surfaceMetric.id] || ""}
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
            isLoading={isInitialKpiLoad}
            isHighlighted={highlightedResearchKpiIds.includes(researchKpiCard.id)}
            deltaLabel={researchKpiDeltaMap[researchKpiCard.id] || ""}
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

    return renderSelectedKpiView();
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
                {refreshButtonLabel}
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
