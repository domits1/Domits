import React from "react";
import { useMemo } from "react";
import countryList from "react-select-country-list";
import LabeledSelect from "../components/LabeledSelect";
import LabeledInput from "../components/LabeledInput";
import useFormStore from "../stores/formStore";
import info from "../../../images/icons/info.png";
import Button from "../components/button";

function AddressInputView() {
  const options = useMemo(() => countryList().getLabels(), []);

  const address = useFormStore((state) => state.accommodationDetails.address);
  const setAddress = useFormStore((state) => state.setAddress);

  const handleCountryChange = (selectedOption) => {
    setAddress({ ...address, country: selectedOption.value });
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setAddress({ ...address, [name]: value });
  };
  return (
    <main className="page-body">
      <h2 className="onboardingSectionTitle">
        Where can we find your accommodation?
      </h2>
      <p className="onboardingSectionSubtitle">
        We only share your address with guests after they have booked
      </p>

      <section className="acco-location">
        <section className="location-left">
          <LabeledSelect
            label="Country*"
            name="Country"
            options={options.map((country) => ({
              value: country,
              label: country,
            }))}
            value={{ value: address.country, label: address.country || "" }}
            onChange={handleCountryChange}
            required
          />

          <LabeledInput
            label="City*"
            name="city"
            value={address.city || ""}
            onChange={handleInputChange}
            placeholder="Select your city"
            required
          />

          <LabeledInput
            label="Street + house nr.*"
            name="street"
            value={address.street || ""}
            onChange={handleInputChange}
            placeholder="Enter your address"
            required
          />

          <LabeledInput
            label="Postal Code*"
            name="zipCode"
            value={address.zipCode || ""}
            onChange={handleInputChange}
            placeholder="Enter your postal code"
            required
            minLength={4}
            maxLength={7}
            pattern="[A-Za-z\\s,]+"
          />
        </section>
      </section>

      <section className="listing-info enlist-info">
        <img src={info} className="info-icon" alt="info icon" />
        <p className="info-msg">Fields with * are mandatory</p>
      </section>

      <nav className="onboarding-button-box">
      <Button routePath="/hostonboarding/accommodation" btnText="Go back" />
      <Button routePath="/hostonboarding/accommodation/address" btnText="Proceed" />
      </nav>
    </main>
  );
}

export default AddressInputView;
