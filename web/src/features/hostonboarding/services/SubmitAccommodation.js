// --- START OF SubmitAccommodation.js (Modified) ---

import { getAccessToken } from "../../../services/getAccessToken";
import { toast } from "react-toastify";

// SubmitAccommodation.js
// Accept the populated builder instance directly
export async function submitAccommodation(navigate, builderInstance) { // Removed fullZustandState param

  // Check if the builder instance seems valid and populated
  // Ensure core properties set by the builder methods exist
  if (
    !builderInstance ||
    typeof builderInstance !== 'object' ||
    !builderInstance.property || // Check if addProperty succeeded
    !builderInstance.propertyType // Check if addPropertyType succeeded
    // Optional: Add checks for other essential parts like location, pricing etc. if needed
  )
  {
    console.error("submitAccommodation called with invalid or incomplete builder instance:", builderInstance);
    toast.error("Submission failed: Invalid data structure prepared.");
    return;
  }

  // --- Create a PLAIN JavaScript object from the builder instance ---
  // (This part remains the same)
  const plainPayload = {
    property: { ...builderInstance.property },
    propertyAmenities: builderInstance.propertyAmenities?.map(amenity => ({ ...amenity })) || [], // Add default empty array
    propertyAvailability: builderInstance.propertyAvailability?.map(avail => ({ ...avail })) || [],
    propertyAvailabilityRestrictions: builderInstance.propertyAvailabilityRestrictions?.map(restriction => ({ ...restriction })) || [],
    propertyCheckIn: { ...builderInstance.propertyCheckIn },
    propertyGeneralDetails: builderInstance.propertyGeneralDetails?.map(detail => ({ ...detail })) || [],
    propertyLocation: { ...builderInstance.propertyLocation },
    propertyPricing: { ...builderInstance.propertyPricing },
    propertyRules: builderInstance.propertyRules?.map(rule => ({ ...rule })) || [],
    propertyType: { ...builderInstance.propertyType },
    propertyImages: builderInstance.propertyImages?.map(image => ({ ...image })) || [],
    ...(builderInstance.propertyTechnicalDetails && {
      propertyTechnicalDetails: { ...builderInstance.propertyTechnicalDetails }
    }),
  };
  // Add null checks for mapped arrays

  // --------------------------------------------------------------------

  console.log("Submitting PLAIN payload:", JSON.stringify(plainPayload, null, 2));

  const token = getAccessToken(); // Fetch token just before the call
  if (!token) {
    console.error("Submission failed: Access token not found.");
    toast.error("Submission failed: Authentication error.");
    return;
  }
  console.log("Access Token being used:", token ? "Token Present" : "Token Missing!"); // Avoid logging full token

  try {
    const response = await fetch("https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property", {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(plainPayload)
    });

    // (Response handling remains the same)
    if (!response.ok) {
      let errorMsg = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || JSON.stringify(errorData);
        console.error("Backend error details:", errorData);
      } catch (e) {
        // If response is not JSON or empty
        try {
          errorMsg = await response.text(); // Try getting text response
        } catch (textErr) {
          errorMsg = response.statusText || errorMsg; // Fallback to status text
        }
      }
      console.error("Submission failed:", response.status, errorMsg);
      toast.error(`Submission failed: ${errorMsg}`);
    } else {
      toast.success("Accommodation submitted successfully!");
      navigate("/hostdashboard");
    }

  } catch (error) {
    console.error("Network error or other issue during submission:", error);
    toast.error(`Submission failed: ${error.message || "Network error"}`);
  }
}
// --- END OF SubmitAccommodation.js (Modified) ---