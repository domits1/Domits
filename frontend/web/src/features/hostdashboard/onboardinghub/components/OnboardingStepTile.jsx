import React from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

const StatusIcon = ({ isLoading, isUnknown, isComplete }) => {
  if (isLoading) {
    return <span className="onboarding-step-tile-status-dot" aria-hidden="true" />;
  }
  if (isUnknown) {
    return <HelpOutlineIcon className="onboarding-step-tile-icon onboarding-step-tile-icon-unknown" />;
  }
  return isComplete ? (
    <CheckCircleIcon className="onboarding-step-tile-icon onboarding-step-tile-icon-complete" />
  ) : (
    <RadioButtonUncheckedIcon className="onboarding-step-tile-icon onboarding-step-tile-icon-incomplete" />
  );
};

StatusIcon.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  isUnknown: PropTypes.bool.isRequired,
  isComplete: PropTypes.bool.isRequired,
};

const OnboardingStepTile = ({
  to,
  title,
  desc,
  isComplete,
  isLoading,
  isUnknown,
  badges,
  subDetail,
  statusCompleteLabel,
  statusIncompleteLabel,
  statusUnknownLabel,
}) => {
  const statusLabel = isLoading ? "" : isUnknown ? statusUnknownLabel : isComplete ? statusCompleteLabel : statusIncompleteLabel;
  const visibleBadges = badges.filter(Boolean);

  return (
    <Link to={to} className="onboarding-step-tile">
      <div className="onboarding-step-tile-status">
        <StatusIcon isLoading={isLoading} isUnknown={isUnknown} isComplete={isComplete} />
      </div>
      <div className="onboarding-step-tile-body">
        <div className="onboarding-step-tile-title-row">
          <span className="onboarding-step-tile-title">{title}</span>
          {visibleBadges.map((badge) => (
            <span key={badge} className="onboarding-step-tile-badge">
              {badge}
            </span>
          ))}
        </div>
        <div className="onboarding-step-tile-desc">{desc}</div>
        {subDetail && <div className="onboarding-step-tile-sub-detail">{subDetail}</div>}
        {statusLabel && <div className="onboarding-step-tile-status-label">{statusLabel}</div>}
      </div>
      <ChevronRightIcon className="onboarding-step-tile-chevron" />
    </Link>
  );
};

OnboardingStepTile.propTypes = {
  to: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  desc: PropTypes.string.isRequired,
  isComplete: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  isUnknown: PropTypes.bool.isRequired,
  badges: PropTypes.arrayOf(PropTypes.string),
  subDetail: PropTypes.string,
  statusCompleteLabel: PropTypes.string.isRequired,
  statusIncompleteLabel: PropTypes.string.isRequired,
  statusUnknownLabel: PropTypes.string.isRequired,
};

OnboardingStepTile.defaultProps = {
  badges: [],
  subDetail: null,
};

export default OnboardingStepTile;
