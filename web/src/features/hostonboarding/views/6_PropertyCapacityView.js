import GuestAmountItem from "../components/GuestAmountItem"
import { useParams } from "react-router-dom"
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"
import { accommodationFields } from "../constants/propertyAmountofGuestData"
import OnboardingButton from "../components/OnboardingButton"
import React from "react"; // React import is present
import "../styles/onboardingHost.scss";

function GuestAmountView() {
  const { type: accommodationType } = useParams();

  const accommodationCapacity = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.accommodationCapacity
  );
  const setAccommodationCapacity = useFormStoreHostOnboarding(
    (state) => state.setAccommodationCapacity
  );

  // Ensure fields is defined before accessing
  const fields = accommodationFields[accommodationType] || []; // Add fallback []

  const incrementAmount = (key, max) => {
    // Add check for accommodationCapacity[key] existence before incrementing
    if (accommodationCapacity && typeof accommodationCapacity[key] === 'number' && accommodationCapacity[key] < max) {
      // Assuming setAccommodationCapacity updates state immutably or your store handles it
      setAccommodationCapacity(key, accommodationCapacity[key] + 1);
    }
  };

  const decrementAmount = (key) => {
    // Add check for accommodationCapacity[key] existence before decrementing
    if (accommodationCapacity && typeof accommodationCapacity[key] === 'number' && accommodationCapacity[key] > 0) {
      // Assuming setAccommodationCapacity updates state immutably or your store handles it
      setAccommodationCapacity(key, accommodationCapacity[key] - 1);
    }
  };

  const isProceedDisabled = !accommodationCapacity || Object.values(accommodationCapacity).every((value) => value === 0);


  return (
    <div className="onboarding-host-div">
      <main className="container">
        <h2 className="onboardingSectionTitle">How many people can stay here?</h2>
        <section className="guest-amount">
          {fields.length > 0 ? (
            fields.map(({ key, label, max }) => (
              accommodationCapacity && typeof accommodationCapacity[key] === 'number' ? (
                <div key={key} style={{
                  borderBottom: label === 'Guests' ? '1px solid #ccc' : 'none',
                  paddingBottom: label === 'Guests' ? '10px' : '0',
                  marginBottom: label === 'Guests' ? '10px' : '0'
                }}>
                  <GuestAmountItem
                    label={label}
                    value={accommodationCapacity[key]}
                    increment={() => incrementAmount(key, max)}
                    decrement={() => decrementAmount(key)}
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
            variant="secondary"
          />
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/amenities`}
            btnText="Proceed"
            disabled={isProceedDisabled}
            className={isProceedDisabled ? "button-disabled" : ""}
          />
        </nav>
      </main>
    </div>
  );
}

export default GuestAmountView;