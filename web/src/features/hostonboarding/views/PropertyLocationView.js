// Desc: Step 3 - Add the address of the accommodation you want to list on the platform

import { useParams } from "react-router-dom";
import AddressFormFields from "../components/AddressFormFields";
import Button from "../components/button";
import { useAddressInput } from "../hooks/usePropertyLocation";

function AddressInputView() {
  const { type: accommodationType } = useParams();

  const { options, details, handleChange } = useAddressInput(accommodationType);
  
  return (
    <main className="page-body">
      <h2 className="onboardingSectionTitle">
        {accommodationType === "boat"
          ? "Where can we find your boat?"
          : accommodationType === "camper"
          ? "Where can we find your camper?"
          : "Where can we find your accommodation?"}
      </h2>
      <p className="onboardingSectionSubtitle">
        We only share your address with guests after they have booked.
      </p>

      <section className="acco-location">
        <section className="location-left">
          <AddressFormFields
            type={accommodationType}
            details={details}
            handleChange={handleChange}
            countryOptions={options.map((country) => ({
              value: country,
              label: country,
            }))}
          />
        </section>
      </section>

      <nav className="onboarding-button-box">
        <Button routePath={`/hostonboarding/${accommodationType}`} btnText="Go back" />
        <Button routePath={`/hostonboarding/${accommodationType}/capacity`} btnText="Proceed" />
      </nav>
    </main>
  );
}

export default AddressInputView;