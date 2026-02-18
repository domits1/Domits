import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "./styles/onboardingHost.scss";
import useFormStoreHostOnboarding from "./stores/formStoreHostOnboarding";
import { getAccessToken } from "../../services/getAccessToken";

const ONBOARDING_ROOT_PATH = "/hostdashboard/hostonboarding";

const trimTrailingSlashes = (path) => {
  if (!path) return "";
  let end = path.length;
  while (end > 1 && path.codePointAt(end - 1) === 47) {
    end -= 1;
  }
  return path.slice(0, end);
};


function OnboardingLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedType = useFormStoreHostOnboarding((state) => state.accommodationDetails.type);
  const propertyId = useFormStoreHostOnboarding((state) => state.accommodationDetails.propertyId);
  const setPropertyId = useFormStoreHostOnboarding((state) => state.setPropertyId);

  useEffect(() => {
    const normalizedPath = trimTrailingSlashes(location.pathname) || ONBOARDING_ROOT_PATH;
    const isOnboardingRoute = normalizedPath.startsWith(ONBOARDING_ROOT_PATH);
    const isRootStep = normalizedPath === ONBOARDING_ROOT_PATH;

    if (isOnboardingRoute && !isRootStep && !selectedType) {
      sessionStorage.removeItem("propertyBuilder");
      navigate(ONBOARDING_ROOT_PATH, { replace: true });
    }
  }, [location.pathname, navigate, selectedType]);

  useEffect(() => {
    const ensureDraft = async () => {
      if (!selectedType) return;
      if (propertyId) return;
      try {
        const res = await fetch(
          "https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property/draft",
          {
            method: "POST",
            headers: {
              Authorization: getAccessToken(),
              "Content-Type": "application/json",
            },
          }
        );
        if (!res.ok) {
          console.error("Failed to create draft property.");
          return;
        }
        const data = await res.json();
        if (data?.propertyId) {
          setPropertyId(data.propertyId);
        }
      } catch (error) {
        console.error("Draft creation failed:", error);
      }
    };

    ensureDraft();
  }, [propertyId, selectedType, setPropertyId]);

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
