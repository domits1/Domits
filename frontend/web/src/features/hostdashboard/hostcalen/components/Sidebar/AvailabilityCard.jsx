import React from "react";
import PropTypes from "prop-types";
import arrowRightIcon from "../../../../../images/arrow-right-icon.svg";

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

export default function AvailabilityCard({
  minimumStay,
  maximumStay,
  advanceNoticeDays,
  onOpenSettings,
}) {
  const openSettings = () => onOpenSettings?.();

  return (
    <section
      className="hc-info-card hc-info-card--interactive"
      aria-label="Open availability settings"
      role="button"
      tabIndex={0}
      onClick={openSettings}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openSettings();
        }
      }}
    >
      <header className="hc-info-card-header">
        <h3 className="hc-info-card-title">Availability</h3>
        <span className="hc-info-card-chevron" aria-hidden="true">
          <img src={arrowRightIcon} alt="" aria-hidden="true" className="hc-chevron-icon" />
        </span>
      </header>

      <p className="hc-info-card-line">{getStayText(minimumStay, maximumStay)}</p>
      <p className="hc-info-card-line">{getAdvanceNoticeText(advanceNoticeDays)}</p>
    </section>
  );
}

AvailabilityCard.propTypes = {
  minimumStay: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  maximumStay: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  advanceNoticeDays: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  onOpenSettings: PropTypes.func,
};
