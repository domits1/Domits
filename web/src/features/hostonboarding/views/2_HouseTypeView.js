import HouseTypeSelector from "../components/HouseTypeSelector"
import OnboardingButton from "../components/OnboardingButton"
import "../styles/TypeSelector.scss";
import "../styles/_base.scss";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import { useBuilder } from "../../../context/propertyBuilderContext";
import { useParams, useNavigate } from "react-router-dom";

// Desc: dependend step 2 - Choose the type of guest access you want to list on the platform
export default function HouseTypeView() {
  const navigate = useNavigate();
  const builder = useBuilder();

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


  const selectedType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.guestAccessType,
  )
  return (
    <div className="onboarding-host-div">
      <main className="container">
        <section className="guest-access">
          <h2 className="onboardingSectionTitle">
            What kind of space do your guests have access to?
          </h2>
          <HouseTypeSelector
            header="Entire house"
            description="Guests have the entire space to themselves"
          />
          <HouseTypeSelector
            header="Private room"
            description="Guests have their own private room for sleeping"
          />
          <HouseTypeSelector
            header="Shared room"
            description="Guests sleep in a room or common area that they may share with you or others"
          />
        </section>

        <nav className="onboarding-button-box">
          <OnboardingButton
            routePath="/hostonboarding"
            btnText="Go back" />
          <OnboardingButton
            onClick={() => {
              builder.addPropertyType({type: "House", spaceType: selectedType}); // 'selectedType' is already defined in this file as guestAccessType
              console.log("Builder after adding house type:", builder);
              navigate("/hostonboarding/accommodation/address");
            }}
            btnText="Proceed"
            disabled={isProceedDisabled}
          />
        </nav>
      </main>
    </div>
  );
}
