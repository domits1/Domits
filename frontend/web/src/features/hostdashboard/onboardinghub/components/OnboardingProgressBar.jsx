import React from "react";
import PropTypes from "prop-types";

const OnboardingProgressBar = ({ completedCount, totalCount, label }) => {
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="onboarding-progress">
      <div className="onboarding-progress-track">
        <div className="onboarding-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="onboarding-progress-label">{label}</div>
    </div>
  );
};

OnboardingProgressBar.propTypes = {
  completedCount: PropTypes.number.isRequired,
  totalCount: PropTypes.number.isRequired,
  label: PropTypes.string.isRequired,
};

export default OnboardingProgressBar;
