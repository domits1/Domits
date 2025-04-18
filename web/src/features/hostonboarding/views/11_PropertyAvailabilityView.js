import React from "react";
import CalendarComponent from "../../hostdashboard/hostcalendar/views/Calender";
import { useParams } from "react-router-dom";
import { useAvailability } from "../hooks/usePropertyCalenderAvailability";
import OnboardingButton from "../components/OnboardingButton";
import { useHandleLegalProceed } from "../hooks/useHandleLegalProceed";

function PropertyAvailabilityView() {
  const { type: accommodationType } = useParams();
  const { availability, updateSelectedDates } = useAvailability();

  const { handleProceedToLegal } = useHandleLegalProceed();

  return (
    <div className="onboarding-host-div">
      <main className="container">
        <h2 className="onboardingSectionTitle">
          Share your first availability
        </h2>
        <p className="onboardingSectionSubtitle">
          You can edit and delete availabilities later within your dashboard
        </p>

        <CalendarComponent
          passedProp={availability}
          isNew={true}
          updateDates={updateSelectedDates}
          calenderType="host"
        />

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/pricing`}
            btnText="Go back"
          />
          <OnboardingButton onClick={handleProceedToLegal} btnText="Proceed" />
        </nav>
      </main>
    </div>
  );
}

export default PropertyAvailabilityView;
