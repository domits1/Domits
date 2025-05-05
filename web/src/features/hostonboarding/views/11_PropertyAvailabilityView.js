import React from "react";
import CalendarComponent from "../../hostdashboard/hostcalendar/views/Calender";
import { useParams, useNavigate } from "react-router-dom";
import { useAvailability } from "../hooks/usePropertyCalenderAvailability";
import OnboardingButton from "../components/OnboardingButton";
import { useHandleLegalProceed } from "../hooks/useHandleLegalProceed";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import { useBuilder } from "../../../context/propertyBuilderContext";

function PropertyAvailabilityView() {
  const navigate = useNavigate();
  const builder = useBuilder();

  const form = useFormStoreHostOnboarding();
  const selectedType = useFormStoreHostOnboarding((state) => state.accommodationDetails.type);

  const { type: accommodationType } = useParams();
  const { availability, updateSelectedDates } = useAvailability();

  const { handleProceedToLegal } = useHandleLegalProceed();

  return (
    <div className="onboarding-host-div">
      <main className="container">
        <h2 className="onboardingSectionTitle">Share your first availability</h2>
        <p className="onboardingSectionSubtitle">You can edit and delete availabilities later within your dashboard</p>

        <CalendarComponent
          passedProp={availability}
          isNew={true}
          updateDates={updateSelectedDates}
          calenderType="host"
        />

        <nav className="onboarding-button-box">
          <OnboardingButton routePath={`/hostonboarding/${accommodationType}/pricing`} btnText="Go back" />
          <OnboardingButton
            onClick={() => {
              // 'availability' is from useAvailability hook
              const selectedDatesData = availability?.selectedDates;
              let datesAdded = false; // Flag to track if dates were successfully added

              if (selectedDatesData && selectedDatesData.startDate && selectedDatesData.endDate) {
                // Convert ISO strings back to timestamps (numbers)
                const startDateTimestamp = new Date(selectedDatesData.startDate).getTime();
                const endDateTimestamp = new Date(selectedDatesData.endDate).getTime();

                if (!isNaN(startDateTimestamp) && !isNaN(endDateTimestamp)) {
                  builder.addAvailability([{
                    availableStartDate: startDateTimestamp,
                    availableEndDate: endDateTimestamp
                  }]);
                  datesAdded = true; // Mark dates as added
                } else {
                  console.error("Invalid date format in selectedDates state.");
                  // Optionally show error toast to user
                  // toast.error("Invalid availability dates selected.");
                  // Consider NOT navigating if dates are required and invalid
                  // return;
                }
              } else {
                console.warn("No valid selected dates found to add to builder.");
                // Decide if proceeding without dates is allowed. If not:
                // toast.error("Please select an availability date range.");
                // return;
              }

              // *** REMOVE addProperty call from here - should be done earlier ***

              console.log("Builder after adding availability (Dates added:", datesAdded, "):", builder);

              // Proceed with navigation
              if (["Villa", "House", "Apartment", "Cottage"].includes(selectedType)) { // selectedType from Zustand
                navigate("/hostonboarding/legal/registrationnumber");
              } else {
                navigate("/hostonboarding/summary");
              }
            }}
            btnText="Proceed"
          />

        </nav>
      </main>
    </div>
  );
}

export default PropertyAvailabilityView;
