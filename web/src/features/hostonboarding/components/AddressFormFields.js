// --- START OF FILE AddressFormFields.js ---

import React from "react";
import LabeledSelect from "./LabeledSelect";
import LabeledInput from "./LabeledInput";

function AddressFormFields({ type, details = {}, handleChange, countryOptions }) { // Default details to {}
                                                                                   // Ensure details is an object even if initially undefined/null
    const safeDetails = details || {};

    // Helper function to create the value object for LabeledSelect
    const getSelectValue = (key) => {
        const value = safeDetails[key] || "";
        return { value: value, label: value }; // Use the value itself as the label if not found in options mapping
    };

    switch (type) {
        case "boat":
            return (
                <>
                    <LabeledSelect
                        label="Country of Registration*"
                        name="country"
                        options={countryOptions}
                        // Use helper function for robust value handling
                        value={getSelectValue('country')}
                        onChange={(option) => handleChange({ country: option ? option.value : "" })} // Handle null option
                        required
                    />
                    <LabeledInput
                        label="City*"
                        name="city"
                        value={safeDetails.city || ""}
                        onChange={(e) => handleChange({ city: e.target.value })}
                        placeholder="Enter the city"
                        required
                    />
                    {/* Harbor remains manual input for boats */}
                    <LabeledInput
                        label="Harbor*"
                        name="harbor"
                        value={safeDetails.harbor || ""}
                        onChange={(e) => handleChange({ harbor: e.target.value })}
                        placeholder="Enter the harbor name"
                        required
                    />
                </>
            );
        case "camper": // Camper and Default share fields, consolidate logic
        default:
            return (
                <>
                    <LabeledSelect
                        label="Country*"
                        name="country"
                        options={countryOptions}
                        value={getSelectValue('country')}
                        onChange={(option) => handleChange({ country: option ? option.value : "" })}
                        required
                    />
                    <LabeledInput
                        label="City*"
                        name="city"
                        value={safeDetails.city || ""}
                        onChange={(e) => handleChange({ city: e.target.value })}
                        placeholder={type === 'camper' ? "Enter the city" : "Select your city"} // Keep placeholder distinction
                        required
                    />
                    <LabeledInput
                        label="Street + house nr.*"
                        name="street"
                        value={safeDetails.street || ""}
                        onChange={(e) => handleChange({ street: e.target.value })}
                        placeholder="Enter your address"
                        required
                    />
                    <LabeledInput
                        label="Postal Code*"
                        name="zipCode"
                        value={safeDetails.zipCode || ""}
                        onChange={(e) => handleChange({ zipCode: e.target.value })}
                        placeholder="Enter your postal code"
                        required
                    />
                </>
            );
    }
}

export default AddressFormFields;
// --- END OF FILE AddressFormFields.js ---