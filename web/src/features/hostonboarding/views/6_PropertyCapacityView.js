// Filename: GuestAmountView.js
import React, { useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import GuestAmountItem from "../components/GuestAmountItem";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import { accommodationFields } from "../constants/propertyAmountofGuestData";
import OnboardingButton from "../components/OnboardingButton";
import "../styles/onboardingHost.scss";
// Removed: import { useBuilder } from '../../../context/propertyBuilderContext';
import { toast } from "react-toastify"; // Keep for potential feedback

function GuestAmountView() {
  // Removed: const builder = useBuilder();
  const navigate = useNavigate();
  const { type: accommodationType } = useParams();

  // --- State Reading and Setters ---
  // Read the specific slice needed for this view
  const accommodationCapacity = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.accommodationCapacity
  );
  const setAccommodationCapacity = useFormStoreHostOnboarding(
    (state) => state.setAccommodationCapacity
  );
  // --------------------------------

  // --- Data for Rendering ---
  const fields = useMemo(() => accommodationFields || [], []);
  // ------------------------

  // --- Handlers for +/- buttons (remain the same) ---
  const incrementAmount = useCallback((key, max) => {
    const currentValue = accommodationCapacity?.[key];
    if (typeof currentValue === 'number' && currentValue < max) {
      setAccommodationCapacity(key, currentValue + 1);
    }
  }, [accommodationCapacity, setAccommodationCapacity]);

  const decrementAmount = useCallback((key) => {
    const currentValue = accommodationCapacity?.[key];
    if (typeof currentValue === 'number' && currentValue > 0) {
      setAccommodationCapacity(key, currentValue - 1);
    }
  }, [accommodationCapacity, setAccommodationCapacity]);
  // -----------------------------

  // --- Proceed Logic ---
  const handleProceed = useCallback(() => {
    // GuestAmount is the primary required field for this view's logic
    if (!accommodationCapacity || accommodationCapacity.GuestAmount <= 0) {
      toast.error("Please specify at least 1 guest."); // User feedback
      return;
    }

    // Removed builder interaction:
    // const propertyData = { /* ... */ };
    // builder.addProperty(propertyData);
    // const detailsToAdd = Object.entries(accommodationCapacity) /* ... */;
    // if (detailsToAdd.length > 0) { builder.addGeneralDetails(detailsToAdd); }
    // console.log("Builder after adding property and capacity details:", builder);

    // Just navigate - capacity details are already in the store
    console.log("Proceeding from GuestAmountView. Capacity data in store:", accommodationCapacity);
    navigate(`/hostonboarding/${accommodationType}/amenities`);

  }, [
    navigate,
    accommodationType,
    accommodationCapacity
    // Removed builder and other dependencies from previous version
  ]);
  // ---------------------

  // --- Disabled State ---
  const isProceedDisabled = useMemo(() => !accommodationCapacity || accommodationCapacity.GuestAmount <= 0, [accommodationCapacity]);
  // --------------------

  // --- JSX (remains the same) ---
  return (
    <div className="onboarding-host-div">
      <main className="container page-body">
        <h2 className="onboardingSectionTitle">How many people can stay here?</h2>
        <section className="guest-amount">
          {fields.length > 0 ? (
            fields.map(({ key, label, max }) => (
              accommodationCapacity && typeof accommodationCapacity[key] === 'number' ? (
                <div key={key} className={`guest-amount-item-container ${key === 'GuestAmount' ? 'guest-amount-main' : ''}`}>
                  <GuestAmountItem
                    label={label + (key === 'GuestAmount' ? '*' : '')}
                    value={accommodationCapacity[key]} // Read from store
                    increment={() => incrementAmount(key, max)} // Update store
                    decrement={() => decrementAmount(key)} // Update store
                    max={max}
                  />
                </div>
              ) : null
            ))
          ) : (
            <p>No capacity fields defined for this accommodation type.</p>
          )}
        </section>
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/description`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={handleProceed} // Calls navigation handler
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
        {isProceedDisabled && accommodationCapacity?.GuestAmount === 0 && (
          <p className="error-message" style={{marginTop: '10px'}}>Please specify the number of guests (must be at least 1).</p>
        )}
      </main>
    </div>
  );
}

export default GuestAmountView;