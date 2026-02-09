import React, { useState } from "react";
import CalendarComponent from "../../hostdashboard/hostcalendar/views/Calender";
import { useParams } from "react-router-dom";
import { useAvailability } from "../hooks/usePropertyCalenderAvailability";
import OnboardingButton from "../components/OnboardingButton";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import { useBuilder } from "../../../context/propertyBuilderContext";
import OnboardingProgress from "../components/OnboardingProgress";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";
import HouseRuleCheckbox from "../components/HouseRuleCheckbox";

function PropertyAvailabilityView() {
  const form = useFormStoreHostOnboarding();
  const builder = useBuilder();
  const { flowKey, prevPath, nextPath } = useOnboardingFlow();
  const selectedType = useFormStoreHostOnboarding((state) => state.accommodationDetails.type);
  const { type: accommodationType } = useParams();
  const { availability, updateSelectedDates } = useAvailability();
  const [selectAll, setSelectAll] = useState(false);

  return (
    <div className="onboarding-host-div availability-onboarding">
      <main className="container">
        <OnboardingProgress />
        <h2 className="onboardingSectionTitle">Share your availability</h2>
        <p className="onboardingSectionSubtitle">
          When is your property available for guests to book? You can update this anytime later within the calendar.
        </p>

        <div className="availability-select-all">
          <HouseRuleCheckbox
            label="Select all"
            value={selectAll}
            onChange={(event) => setSelectAll(event.target.checked)}
          />
        </div>

        <div className="availability-calendar">
          <CalendarComponent
            passedProp={availability}
            isNew={true}
            updateDates={updateSelectedDates}
            calenderType="guest"
            builder={builder}
            selectionMode="range"
            showOptions={false}
            allowSingleDeselect={true}
            selectAll={selectAll}
            onSelectionChange={({ isAllSelected }) => {
              if (selectAll && !isAllSelected) {
                setSelectAll(false);
              }
            }}
          />
        </div>

        <p className="availability-note">You can change this later.</p>

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={prevPath || `/hostonboarding/${accommodationType}/pricing`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={() => {
              if (flowKey !== "accommodation") {
                builder.addProperty({
                  title: form.accommodationDetails.title,
                  subtitle: form.accommodationDetails.subtitle,
                  description: form.accommodationDetails.description,
                  guestCapacity: form.accommodationDetails.accommodationCapacity.GuestAmount,
                  registrationNumber: "",
                  status: "",
                  propertyType: selectedType,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
                });
              }
              return true;
            }}
            routePath={nextPath || "/hostonboarding/summary"}
            btnText="Proceed"
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyAvailabilityView;