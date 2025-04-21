import React from "react";
// Use the component name from your original code's import statement
import HouseTypeSelector from "../../../../../../../../Desktop/hostonboarding copy/components/HouseTypeSelector";
// Use the consistent Button component name and store established before
import OnboardingButton from "../../../../../../../../Desktop/hostonboarding copy/components/OnboardingButton";
import useFormStoreHostOnboarding from "../../../../../../../../Desktop/hostonboarding copy/stores/formStoreHostOnboarding";
// Add the standard CSS import if used by other onboarding steps
import '../../../../../../../../Desktop/hostonboarding copy/styles/onboardingHost.css';

// Rename function to match filename conventions (optional, but good practice)
function HouseTypeView() {
  // Get the current value and the setter function from the correct store
  const selectedGuestAccessType = useFormStoreHostOnboarding((state) => state.accommodationDetails.guestAccessType);
  const setGuestAccessType = useFormStoreHostOnboarding((state) => state.setGuestAccessType); // Assuming this setter exists in your store

  // This logic is correct
  const isProceedDisabled = !selectedGuestAccessType;

  // Define the values for easier reference
  const GUEST_ACCESS_TYPES = {
    ENTIRE: "Entire house",
    PRIVATE: "Private room",
    SHARED: "Shared room",
  };

  return (
    // Add the standard wrapper div and main structure for consistency if needed
    <div className="onboarding-host-div">
      <main className="page-body"> {/* Use 'page-body' if consistent with other steps */}
        {/* Use 'guest-access' section class if your CSS relies on it */}
        <section className="guest-access">
          <h2 className="onboardingSectionTitle">
            What kind of space will guests have access to? {/* Updated title slightly */}
          </h2>

          {/* Add onClick and isSelected props to EACH selector instance */}
          <HouseTypeSelector
            header={GUEST_ACCESS_TYPES.ENTIRE}
            description="Guests have the entire space to themselves"
            // Tell the component to call the store setter when clicked
            onClick={() => setGuestAccessType(GUEST_ACCESS_TYPES.ENTIRE)}
            // Tell the component if it should appear selected
            isSelected={selectedGuestAccessType === GUEST_ACCESS_TYPES.ENTIRE}
          />
          <HouseTypeSelector
            header={GUEST_ACCESS_TYPES.PRIVATE}
            description="Guests have their own private room for sleeping"
            onClick={() => setGuestAccessType(GUEST_ACCESS_TYPES.PRIVATE)}
            isSelected={selectedGuestAccessType === GUEST_ACCESS_TYPES.PRIVATE}
          />
          <HouseTypeSelector
            header={GUEST_ACCESS_TYPES.SHARED}
            description="Guests sleep in a room or common area that they may share with you or others"
            onClick={() => setGuestAccessType(GUEST_ACCESS_TYPES.SHARED)}
            isSelected={selectedGuestAccessType === GUEST_ACCESS_TYPES.SHARED}
          />
        </section>

        <nav className="onboarding-button-box">
          {/* Use OnboardingButton */}
          <OnboardingButton
            routePath="/hostonboarding" // Go back to previous step
            btnText="Go back"
            variant="secondary" // Add variant for consistency
          />
          <OnboardingButton
            // Corrected route path based on App.js (usually Address next)
            routePath="/hostonboarding/accommodation/address"
            btnText="Proceed"
            disabled={isProceedDisabled}
            // Remove redundant className - handled by OnboardingButton internally
          />
        </nav>
      </main>
    </div>
  );
}

// Use the filename-consistent export name
export default HouseTypeView;