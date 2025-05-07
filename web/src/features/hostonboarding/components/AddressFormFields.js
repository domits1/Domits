import React from "react";
import LabeledSelect from "./LabeledSelect";
import LabeledInput from "./LabeledInput";

function AddressFormFields({ type, details, handleChange, countryOptions = [] }) {
  const isBoat = type === 'boat';

  return (
    <>
      <LabeledInput
        label="Country*"
        name="country"
        value={details.country || ""}
        onChange={() => {}} // No-op since it's static
        placeholder="Country will be filled by the map"
        readOnly
        required
      />
      <LabeledInput
        label="City*"
        name="city"
        value={details.city || ""}
        onChange={(e) => handleChange("city", e.target.value)}
        placeholder="Select your city"
        required
      />
      {isBoat && (
        <LabeledInput
          label="Harbor Name*"
          name="harbor"
          value={details.harbor || ""}
          onChange={(e) => handleChange("harbor", e.target.value)}
          placeholder="Enter the harbor name"
          required
        />
      )}
      {!isBoat && (
        <>
          <LabeledInput
            label="Street*"
            name="street"
            value={details.street || ""}
            onChange={(e) => handleChange("street", e.target.value)}
            placeholder="Enter your street name"
            required
          />
          <LabeledInput
            label="House number"
            name="houseNumber"
            value={details.houseNumber || ""}
            onChange={(e) => handleChange("houseNumber", e.target.value)}
            placeholder="e.g., 123"
          />
          <LabeledInput
            label="House number extension"
            name="houseNumberExtension"
            value={details.houseNumberExtension || ""}
            onChange={(e) => handleChange("houseNumberExtension", e.target.value)}
            placeholder="e.g., A or bis"
          />
          <LabeledInput
            label="Postal Code*"
            name="zipCode"
            value={details.zipCode || ""}
            onChange={(e) => handleChange("zipCode", e.target.value)}
            placeholder="Enter your postal code"
            required
          />
        </>
      )}
    </>
  );
}

export default AddressFormFields;