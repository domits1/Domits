import { getAccessToken } from "../../../services/getAccessToken";
import { toast } from "react-toastify";

// SubmitAccommodation.js
// Remove builder from parameters, accept payload directly
export async function submitAccommodation(navigate, payload) {
  // Remove const payload = builder.build();

  // Payload null check should happen in handleSubmit before calling this,
  // but keep a safety check just in case.
  if (!payload) {
    console.error("submitAccommodation called with null payload.");
    toast.error("Submission failed: Invalid data.");
    return;
  }

  console.log("Submitting FINAL payload:", JSON.stringify(payload, null, 2)); // Log final payload

  const token = getAccessToken();
  console.log("Access Token being used:", token); // Debug token

  try {
    const response = await fetch("https://wkmwpwurbc.execute-api.eu-north-1.amazonaws.com/default/property", {
      method: "POST",
      headers: {
        // Add Bearer prefix if required by your API Gateway Authorizer
        // "Authorization": `Bearer ${token}`,
        "Authorization": token, // Use token directly if no prefix needed
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload) // Use the passed payload object
    });

    // ... existing response handling ...
    if (!response.ok) {
      let errorMsg = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || JSON.stringify(errorData);
      } catch (e) {
        errorMsg = response.statusText || errorMsg;
      }
      console.error("Submission failed:", response.status, errorMsg);
      toast.error(`Submission failed: ${errorMsg}`);
    } else {
      toast.success("Accommodation submitted successfully!");
      navigate("/hostdashboard");
    }

  } catch (error) {
    console.error("Network error or other issue during submission:", error);
    toast.error("Submission failed due to network error or other issue.");
  }
  // console.log(builder.build()); // Remove this - payload is already built
}
