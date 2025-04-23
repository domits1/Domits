import React from "react";
import CalendarComponent from "../../hostdashboard/hostcalendar/views/Calender";
import { useNavigate, useParams } from "react-router-dom";
import { useAvailability } from "../hooks/usePropertyCalenderAvailability";
import OnboardingButton from "../components/OnboardingButton";
import { useHandleLegalProceed } from "../hooks/useHandleLegalProceed";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import { useBuilder } from "../../../context/propertyBuilderContext";

function PropertyAvailabilityView() {
  const form = useFormStoreHostOnboarding();
  const builder = useBuilder();
  const selectedType = useFormStoreHostOnboarding((state) => state.accommodationDetails.type);

  const navigate = useNavigate();

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
              builder.addAvailability([{availableStartDate: Date.now() + 600000, availableEndDate: 3023923200000}]);
              if (["Villa", "House", "Apartment", "Cottage"].includes(selectedType)) {
                navigate("/hostonboarding/legal/registrationnumber");
              } else {
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
