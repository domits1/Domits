import React from "react";
import LabeledSelect from "./LabeledSelect";
import LabeledInput from "./LabeledInput";

// Changed props: Use details, handleChange from the hook/store. Removed location, setLocation. Added type.
function AddressFormFields({ type, details, handleChange, countryOptions }) {

  // REMOVED internal handleChange - use the one passed via props from the hook

  // Determine if the type requires specific fields (like Harbor for boat)
  const isBoat = type === 'boat';
  const isCamper = type === 'camper'; // Added for potential camper specific fields

  return (
    <>
      <LabeledSelect
        label="Country*"
        name="country"
        options={countryOptions}
        // Find the matching option object for the current value
        value={countryOptions.find(option => option.value === details.country) || null}
        // Use the passed handleChange prop to update the store via the hook
        onChange={(selectedOption) => handleChange("country", selectedOption ? selectedOption.value : "")}
        required
      />
      <LabeledInput
        label="City*"
        name="city"
        value={details.city || ""}
        // Use the passed handleChange prop
        onChange={(e) => handleChange("city", e.target.value)}
        placeholder="Select your city"
        required
      />
      {/* Conditionally render Harbor input for boats */}
      {isBoat && (
        <LabeledInput
          label="Harbor Name*"
          name="harbor"
          value={details.harbor || ""}
          onChange={(e) => handleChange("harbor", e.target.value)}
          placeholder="Enter the harbor name"
          required={isBoat} // Required only if it's a boat
        />
      )}

      {/* For non-boats, show Street, House Number, Postal Code */}
      {!isBoat && (
        <>
          <LabeledInput
            label="Street*"
            name="street"
            value={details.street || ""}
            // Use the passed handleChange prop
            onChange={(e) => handleChange("street", e.target.value)}
            placeholder="Enter your street name"
            required={!isBoat} // Standard address fields required for non-boats
          />
          {/* Optional: Keep separate House Number fields or combine into Street */}
          {/* Assuming separate fields for clarity */}
          <LabeledInput
            label="House number"
            name="houseNumber"
            value={details.houseNumber || ""}
            onChange={(e) => handleChange("houseNumber", e.target.value)}
            placeholder="e.g., 123"
            // required={!isBoat} // Maybe not strictly required if coords are set? Align with isProceedDisabled logic
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
            name="zipCode" // Use 'zipCode' to match geocoding and hook logic
            value={details.zipCode || ""}
            // Use the passed handleChange prop
            onChange={(e) => handleChange("zipCode", e.target.value)}
            placeholder="Enter your postal code"
            required={!isBoat} // Standard address fields required for non-boats
          />
        </>
      )}

      {/* Note: If you want a single 'Street + House Number' field,
          adjust the LabeledInput and the handleChange logic accordingly.
          The current setup assumes separate fields in the 'details' object
          for street, houseNumber, and houseNumberExtension, besides zipCode.
          Make sure usePropertyLocation.js hook's handleManualInputChange
          updates these fields correctly.
       */}
      {/* Add fields specific to Campers if needed */}
      {/* {isCamper && ( ... camper specific fields ... )} */}
    </>
  );
}

export default AddressFormFields;