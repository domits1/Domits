import React from "react";
import PropTypes from "prop-types";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import styles from "../WebsiteBuilderPage.module.scss";

export function WebsiteKpiMetricCard({
  title,
  value,
  meta,
  isLoading,
  loadingMeta = "Loading aggregated website activity...",
}) {
  return (
    <article className={styles.kpiCard}>
      <p className={styles.kpiCardTitle}>{title}</p>
      {isLoading ? (
        <div className={styles.kpiCardLoader}>
          <PulseBarsLoader inline message="" />
        </div>
      ) : (
        <p className={styles.kpiCardValue}>{value}</p>
      )}
      <p className={styles.kpiCardMeta}>{isLoading ? loadingMeta : meta}</p>
    </article>
  );
}

WebsiteKpiMetricCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  meta: PropTypes.string.isRequired,
  isLoading: PropTypes.bool.isRequired,
  loadingMeta: PropTypes.string,
};

export function WebsiteKpiResearchCard({ researchKpiCard, isLoading }) {
  const statusClassName =
    isLoading || !researchKpiCard.isInstrumented
      ? styles.researchKpiStatusBadgePending
      : styles.researchKpiStatusBadgeReady;

  return (
    <article className={styles.researchKpiCard}>
      <div className={styles.researchKpiCardHeader}>
        <p className={styles.researchKpiCardTitle}>{researchKpiCard.id}</p>
        <span className={`${styles.researchKpiStatusBadge} ${statusClassName}`.trim()}>
          {isLoading ? "Loading" : researchKpiCard.statusLabel}
        </span>
      </div>
      {isLoading ? (
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
        {isLoading
          ? "Loading KPI status and instrumentation availability..."
          : researchKpiCard.note}
      </p>
    </article>
  );
}

WebsiteKpiResearchCard.propTypes = {
  researchKpiCard: PropTypes.shape({
    id: PropTypes.string.isRequired,
    criteria: PropTypes.arrayOf(PropTypes.string).isRequired,
    isInstrumented: PropTypes.bool.isRequired,
    statusLabel: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    note: PropTypes.string.isRequired,
  }).isRequired,
  isLoading: PropTypes.bool.isRequired,
};
