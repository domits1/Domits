import React from "react";
import PropTypes from "prop-types";
import { NavLink } from "react-router-dom";

const tabClassName = ({ isActive }) => `onboarding-mode-tab${isActive ? " onboarding-mode-tab--active" : ""}`;

const OnboardingModeTabs = ({ hostLabel, enterpriseLabel }) => (
  <nav className="onboarding-mode-tabs" aria-label="Onboarding mode">
    <NavLink to="/hostdashboard/settings/onboarding" end className={tabClassName}>
      {hostLabel}
    </NavLink>
    <NavLink to="/hostdashboard/settings/onboarding/enterprise" className={tabClassName}>
      {enterpriseLabel}
    </NavLink>
  </nav>
);

OnboardingModeTabs.propTypes = {
  hostLabel: PropTypes.string.isRequired,
  enterpriseLabel: PropTypes.string.isRequired,
};

export default OnboardingModeTabs;
