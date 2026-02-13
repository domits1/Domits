import { Outlet } from "react-router-dom";
import "./styles/onboardingHost.scss";


function OnboardingLayout() {

  return (
    <div className="onboarding-shell">
      <div className="onboarding-shell-content">
        <div className="onboarding-card">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default OnboardingLayout;
