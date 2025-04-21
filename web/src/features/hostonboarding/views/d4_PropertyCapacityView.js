import React from 'react';
import GuestAmountItem from "../../../../../../../../Desktop/hostonboarding copy/components/GuestAmountItem";
import { useParams } from "react-router-dom";
import useFormStore from "../../../../../../../../Desktop/hostonboarding copy/stores/formStore";
import { accommodationFields } from "../../../../../../../../Desktop/hostonboarding copy/constants/propertyAmountofGuestData";
import Button from "../../../../../../../../Desktop/hostonboarding copy/components/OnboardingButton";

function GuestAmountView() {
  const { type: accommodationType } = useParams();

  const accommodationCapacity = useFormStore(
      (state) => state.accommodationDetails.accommodationCapacity
  );
  const setAccommodationCapacity = useFormStore(
      (state) => state.setAccommodationCapacity
  );

  const fields = accommodationFields[accommodationType];

  const incrementAmount = (key, max) => {
    if (accommodationCapacity[key] < max) {
      setAccommodationCapacity(key, accommodationCapacity[key] + 1);
    }
  };

  const decrementAmount = (key) => {
    if (accommodationCapacity[key] > 0) {
      setAccommodationCapacity(key, accommodationCapacity[key] - 1);
    }
  };

  const isProceedDisabled = Object.values(accommodationCapacity).every((value) => value === 0);

  return (
      <main className="container">
        <h2 className="onboardingSectionTitle">How many people can stay here?</h2>
        <section className="guest-amount">
          {fields.map(({ key, label, max }) => (
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
          ))}
        </section>
        <nav className="onboarding-button-box">
          <Button routePath={`/hostonboarding/${accommodationType}/description`} btnText="Go back" />
          <Button routePath={`/hostonboarding/${accommodationType}/amenities`} btnText="Proceed" disabled={isProceedDisabled} className={isProceedDisabled ? "button-disabled" : ""} />
        </nav>
      </main>
  );
}

export default GuestAmountView;