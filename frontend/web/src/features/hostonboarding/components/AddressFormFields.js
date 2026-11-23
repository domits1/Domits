import React from "react";
import LabeledSelect from "./LabeledSelect";
import LabeledInput from "./LabeledInput";

function AddressFormFields({ location, setLocation, countryOptions, houseNumberError = "" }) {

  const handleChange = (field, value) => {
    setLocation({ [field]: value });
  };

  return (
    <>
      <LabeledSelect
        label="Country*"
        name="country"
        options={countryOptions}
        value={{ value: location.country, label: location.country || "" }}
        onChange={(option) => handleChange("country", option.value)}
        required
      />
      <LabeledInput
        label="City*"
        name="city"
        value={location.city || ""}
        onChange={(e) => handleChange("city", e.target.value)}
        placeholder="Select your city"
        required
      />
      <LabeledInput
        label="Street"
        name="street"
        value={location.street || ""}
        onChange={(e) => handleChange("street", e.target.value)}
        placeholder="Enter your street"
        required
      />
      <LabeledInput
        label="House number + house number extension, ex: 123 a"
        name="houseNumber"
        value={location.houseNumber || ""}
        onChange={(e) => handleChange("houseNumber", e.target.value)}
        placeholder="Enter your house number + house number extension"
        required
        aria-invalid={houseNumberError ? true : undefined}
        aria-describedby={houseNumberError ? "houseNumber-error" : undefined}
      />
      {houseNumberError ? (
        <p id="houseNumber-error" className="error-text">
          {houseNumberError}
        </p>
      ) : null}
      <LabeledInput
        label="Postal Code*"
        name="postalCode"
        value={location.postalCode || ""}
        onChange={(e) => handleChange("postalCode", e.target.value)}
        placeholder="Enter your postal code"
        required
      />
    </>
  );
}

export default AddressFormFields;
