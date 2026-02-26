import React from "react";

const getStayText = (minimumStay, maximumStay) => {
  const min = Math.max(1, Number(minimumStay) || 1);
  const max = Math.max(0, Number(maximumStay) || 0);

  if (max === 0) {
    return `${min}+ night stays`;
  }

  return `${min} - ${max} night stays`;
};

const getAdvanceNoticeText = (advanceNoticeDays) => {
  const days = Math.max(0, Number(advanceNoticeDays) || 0);
  if (days === 0) {
    return "Same day advance notice";
  }
  if (days === 1) {
    return "1 day advance notice";
  }
  return `${days} days advance notice`;
};

export default function AvailabilityCard({ minimumStay, maximumStay, advanceNoticeDays }) {
  return (
    <section className="hc-info-card" aria-label="Availability summary">
      <header className="hc-info-card-header">
        <h3 className="hc-info-card-title">Availability</h3>
        <span className="hc-info-card-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
            <path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </span>
      </header>

      <p className="hc-info-card-line">{getStayText(minimumStay, maximumStay)}</p>
      <p className="hc-info-card-line">{getAdvanceNoticeText(advanceNoticeDays)}</p>
    </section>
  );
}
