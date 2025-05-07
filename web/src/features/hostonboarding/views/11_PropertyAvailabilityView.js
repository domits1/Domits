// File: input_file_33.js (PropertyAvailabilityView)
import React, { useCallback, useMemo } from "react"; // Added useCallback, useMemo
import { useParams, useNavigate } from "react-router-dom";
import CalendarComponent from "../../hostdashboard/hostcalendar/views/Calender"; // Check path
import { useAvailability } from "../hooks/usePropertyCalenderAvailability"; // Check path
import OnboardingButton from "../components/OnboardingButton";
// Removed unused hook import: import { useHandleLegalProceed } from "../hooks/useHandleLegalProceed";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
// REMOVED: import { useBuilder } from "../../../context/propertyBuilderContext";
import { toast } from "react-toastify"; // For user feedback

function PropertyAvailabilityView() {
  const navigate = useNavigate();
  // REMOVED: const builder = useBuilder();
  const { type: accommodationType } = useParams();

  // --- State & Setters from Store/Hooks (Unchanged) ---
  const { availability, updateSelectedDates } = useAvailability();
  const selectedType = useFormStoreHostOnboarding((state) => state.accommodationDetails.type);
  const selectedDates = useMemo(() => availability?.selectedDates, [availability]);
  // ----------------------------------------

  // --- Disabled State (Unchanged) ---
  const isProceedDisabled = useMemo(() => {
    // The store saves selectedDates as { startDate: ISOString, endDate: ISOString }
    return !selectedDates || !selectedDates.startDate || !selectedDates.endDate;
  }, [selectedDates]);
  // --------------------

  // --- *** MODIFIED Proceed Logic *** ---
  const handleProceed = useCallback(() => {
    if (isProceedDisabled) {
      toast.error("Please select an availability date range.");
      return;
    }

    // The selected dates (startDate, endDate as ISO strings) are already
    // stored in the Zustand state within accommodationDetails.availability.selectedDates
    // by the updateSelectedDates action, which is triggered by the CalendarComponent.
    // No need to extract, convert, or add them again here.

    // REMOVED: let datesAdded = false;
    // REMOVED: Timestamp conversion logic
    // REMOVED: Validation of timestamps
    // REMOVED: builder.addAvailability call
    // REMOVED: console.log("Builder after adding availability...");

    // Log the state from the store for confirmation
    console.log("Proceeding from PropertyAvailabilityView. Availability data in store:", availability); // Log the whole availability slice

    // Navigate based on the property type stored in Zustand (Unchanged)
    if (["Villa", "House", "Apartment", "Cottage"].includes(selectedType)) {
      navigate("/hostonboarding/legal/registrationnumber");
    } else {
      navigate("/hostonboarding/summary");
    }

  }, [
    navigate,
    selectedType, // Used for navigation logic
    availability, // Log the current state
    isProceedDisabled
    // REMOVED: builder dependency
    // REMOVED: selectedDates dependency (now covered by 'availability')
  ]); // Dependencies updated
  // --- **************************** ---

  // --- JSX (Unchanged) ---
  return (
    <div className="onboarding-host-div">
      <main className="container page-body">
        <h2 className="onboardingSectionTitle">Select Your First Availability</h2>
        <p className="onboardingSectionSubtitle">
          Choose a start and end date for when your property is available.
          You can add more ranges and block dates later in your dashboard.
        </p>

        <CalendarComponent
          passedProp={availability} // Pass full availability object which includes selectedDates
          isNew={true}
          updateDates={updateSelectedDates} // Calendar updates the store directly
          calenderType="host"
        />

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/pricing`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={handleProceed} // Use the modified handler
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
        {isProceedDisabled && (
          <p className="error-message" style={{ marginTop: '10px' }}>Please select a start and end date on the calendar.</p>
        )}
      </main>
    </div>
  );
}

export default PropertyAvailabilityView;