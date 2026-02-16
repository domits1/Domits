import GuestAmountItem from "../components/GuestAmountItem";
import { useParams } from "react-router-dom";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import { accommodationFields } from "../constants/propertyAmountofGuestData";
import OnboardingButton from "../components/OnboardingButton";
import { useBuilder } from "../../../context/propertyBuilderContext";
import OnboardingProgress from "../components/OnboardingProgress";
import { useOnboardingFlow } from "../hooks/useOnboardingFlow";
function PropertyCapacityView() {
  const builder = useBuilder();
  const { prevPath, nextPath } = useOnboardingFlow();
  const { type: accommodationType } = useParams();
  const accommodationCapacity = useFormStoreHostOnboarding((state) => state.accommodationDetails.accommodationCapacity);
  const setAccommodationCapacity = useFormStoreHostOnboarding((state) => state.setAccommodationCapacity);
  const fields = accommodationFields;
  const hasGuestCapacity = accommodationCapacity.GuestAmount > 0;

  const setAmount = (key, nextValue, max) => {
    const rawValue = String(nextValue ?? "");
    const digitsOnly = rawValue.replace(/\D/g, "");
    const normalizedInput = digitsOnly.replace(/^0+(\d)/, "$1");

    if (normalizedInput === "") {
      setAccommodationCapacity(key, 0);
      return;
    }

    const parsedValue = Number(normalizedInput);
    if (!Number.isFinite(parsedValue)) {
      return;
    }
    const normalizedValue = Math.max(0, Math.min(max, Math.trunc(parsedValue)));
    setAccommodationCapacity(key, normalizedValue);
  };

  const incrementAmount = (key, max) => {
    setAmount(key, accommodationCapacity[key] + 1, max);
  };

  const decrementAmount = (key, max) => {
    setAmount(key, accommodationCapacity[key] - 1, max);
  };
  return (
    <div className="onboarding-host-div">
      <main className="container">
        <OnboardingProgress />
        <h2 className="onboardingSectionTitle">How many people can stay here?</h2>
        <section className="guest-amount">
          {fields.map(({ key, label, max }) => (
            <GuestAmountItem
              key={key}
              label={label}
              value={accommodationCapacity[key]}
              increment={() => incrementAmount(key, max)}
              decrement={() => decrementAmount(key, max)}
              setValue={(value) => setAmount(key, value, max)}
              max={max}
            />
          ))}
        </section>
        <p className="guest-amount-note">You can change this later.</p>
        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath={prevPath || `/hostonboarding/${accommodationType}/address`}
            btnText="Go back"
          />
          <OnboardingButton
            onClick={() => {
              builder.addGeneralDetails(
                fields.map((field) => ({
                  detail: field.label,
                  value: accommodationCapacity[field.key],
                }))
              );
            }}
            routePath={nextPath || `/hostonboarding/${accommodationType}/amenities`}
            btnText="Proceed"
            disabled={!hasGuestCapacity}
          />
        </nav>
      </main>
    </div>
  );
}

export default PropertyCapacityView;
