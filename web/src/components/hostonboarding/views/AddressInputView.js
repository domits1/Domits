import React, { useMemo } from "react";
import countryList from "react-select-country-list";
import { useParams } from "react-router-dom";
import useFormStore from "../stores/formStore";
import AddressFormFields from "../components/AddressFormFields";
import Button from "../components/button";

function AddressInputView() {
  const { type } = useParams();
  const accommodationType = type || "accommodation";

  const options = useMemo(() => countryList().getLabels(), []);
  const {
    accommodationDetails,
    setBoatDetails,
    setCamperDetails,
    setAddress,
  } = useFormStore();

  const details =
    accommodationType === "boat"
      ? accommodationDetails.boatDetails
      : accommodationType === "camper"
      ? accommodationDetails.camperDetails
      : accommodationDetails.address;

  const handleChange =
    accommodationType === "boat"
      ? setBoatDetails
      : accommodationType === "camper"
      ? setCamperDetails
      : setAddress;

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