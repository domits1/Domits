import React from "react";
import PropTypes from "prop-types";
import PulseBarsLoader from "../../../../components/loaders/PulseBarsLoader";
import styles from "../WebsiteBuilderPage.module.scss";

function WebsiteKpiDeltaBadge({ label }) {
  if (!label) {
    return null;
  }

  return <span className={styles.kpiDeltaBadge}>{label}</span>;
}

WebsiteKpiDeltaBadge.propTypes = {
  label: PropTypes.string,
};

export function WebsiteKpiMetricCard({
  title,
  value,
  meta,
  isLoading,
  loadingMeta = "Loading aggregated website activity...",
  isHighlighted = false,
  sampleLabel = "",
  deltaLabel = "",
}) {
  const cardClassName = `${styles.kpiCard} ${isHighlighted ? styles.kpiCardUpdated : ""}`.trim();

  return (
    <article className={cardClassName}>
      <div className={styles.kpiCardHeader}>
        <p className={styles.kpiCardTitle}>{title}</p>
        {sampleLabel ? <span className={styles.kpiCardSampleBadge}>{sampleLabel}</span> : null}
      </div>
      {isLoading ? (
        <div className={styles.kpiCardLoader}>
          <PulseBarsLoader inline message="" />
        </div>
      ) : (
        <div className={styles.kpiCardValueWrap}>
          <p className={styles.kpiCardValue}>{value}</p>
          <WebsiteKpiDeltaBadge label={deltaLabel} />
        </div>
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
  isHighlighted: PropTypes.bool,
  sampleLabel: PropTypes.string,
  deltaLabel: PropTypes.string,
};

export function WebsiteKpiResearchCard({
  researchKpiCard,
  isLoading,
  isHighlighted = false,
  deltaLabel = "",
}) {
  const statusClassName =
    isLoading || !researchKpiCard.isInstrumented
      ? styles.researchKpiStatusBadgePending
      : styles.researchKpiStatusBadgeReady;
  const cardClassName = `${styles.researchKpiCard} ${
    isHighlighted ? styles.researchKpiCardUpdated : ""
  }`.trim();

  return (
    <article className={cardClassName}>
      <div className={styles.researchKpiCardHeader}>
        <div>
          <p className={styles.researchKpiCardTitle}>{researchKpiCard.id}</p>
          {researchKpiCard.sampleLabel ? (
            <span className={styles.kpiCardSampleBadge}>{researchKpiCard.sampleLabel}</span>
          ) : null}
        </div>
        <span className={`${styles.researchKpiStatusBadge} ${statusClassName}`.trim()}>
          {isLoading ? "Loading" : researchKpiCard.statusLabel}
        </span>
      </div>
      {isLoading ? (
        <div className={styles.researchKpiCardLoader}>
          <PulseBarsLoader inline message="" />
        </div>
      ) : (
        <div className={styles.kpiCardValueWrap}>
          <p className={styles.researchKpiCardValue}>{researchKpiCard.value}</p>
          <WebsiteKpiDeltaBadge label={deltaLabel} />
        </div>
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
    sampleLabel: PropTypes.string,
  }).isRequired,
  isLoading: PropTypes.bool.isRequired,
  isHighlighted: PropTypes.bool,
  deltaLabel: PropTypes.string,
};
