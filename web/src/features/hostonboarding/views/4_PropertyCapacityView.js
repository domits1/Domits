// Desc: Step 4 - Add the number of guests that can stay in the accommodation you want to list on the platform

import GuestAmountItem from "../components/GuestAmountItem"
import { useParams } from "react-router-dom"
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"
import { accommodationFields } from "../constants/propertyAmountofGuestData"
import OnboardingButton from "../components/OnboardingButton"

function PropertyCapacityView() {
  const { type: accommodationType } = useParams();

  const accommodationCapacity = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.accommodationCapacity,
  )
  const setAccommodationCapacity = useFormStoreHostOnboarding(
    (state) => state.setAccommodationCapacity,
  )

  const fields = accommodationFields[accommodationType]

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
  return (
    <div className="onboarding-host-div">
      <main className="container">
        <h2 className="onboardingSectionTitle">
          How many people can stay here?
        </h2>
        <section className="guest-amount">
          {fields.map(({ key, label, max }) => (
            <GuestAmountItem
              key={key}
              label={label}
              value={accommodationCapacity[key]}
              increment={() => incrementAmount(key, max)}
              decrement={() => decrementAmount(key)}
              max={max}
            />
          ))}
        </section>
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/address`}
            btnText="Go back"
          />
          <OnboardingButton
            routePath={`/hostonboarding/${accommodationType}/amenities`}
            btnText="Proceed"
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyCapacityView;