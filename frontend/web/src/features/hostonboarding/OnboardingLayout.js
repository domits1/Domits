import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import "./styles/onboardingHost.scss";
import useFormStoreHostOnboarding from "./stores/formStoreHostOnboarding";
import { getAccessToken } from "../../services/getAccessToken";


function OnboardingLayout() {
  const propertyId = useFormStoreHostOnboarding((state) => state.accommodationDetails.propertyId);
  const setPropertyId = useFormStoreHostOnboarding((state) => state.setPropertyId);

  useEffect(() => {
    const ensureDraft = async () => {
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
  }, [propertyId, setPropertyId]);

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
