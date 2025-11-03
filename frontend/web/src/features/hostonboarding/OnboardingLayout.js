import { Outlet } from "react-router-dom";
import "./styles/onboardingHost.scss";


function OnboardingLayout() {

  return (
    <div className="main-dashboard-guest">
      <div className="main-dashboard-content">
        <Outlet />
      </div>
    </div>
  );
}

export default OnboardingLayout;
