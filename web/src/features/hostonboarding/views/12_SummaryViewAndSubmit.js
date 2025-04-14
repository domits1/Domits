import React, { useState, useEffect } from "react";
import { useSummary } from "../hooks/usePropertyCheckOutAndCompletion";
import SummaryTable from "../components/SummaryTable";
import SpecificationsTable from "../components/SpecificationsTable";
import DeclarationSection from "../components/DeclarationSection";
import useFormStore from "../stores/formStore";
import FetchUserId from "../utils/FetchUserId";
import { useNavigate, useParams } from "react-router-dom"; // Added useParams
import Button from "../components/OnboardingButton"; // Using Button component

function SummaryViewAndSubmit() {
  const { data, toggleDrafted, loading, error } = useSummary();
  const navigate = useNavigate();
  const { type: accommodationType } = useParams(); // Get type for back navigation
  const submitAccommodation = useFormStore((state) => state.submitAccommodation);

  const [declare, setDeclare] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const handleSubmit = async () => {
    if (!declare || !confirm) {
      alert("You must agree to the terms and declare the property is legitimate.");
      return;
    }
    try {
      await submitAccommodation(navigate); // Pass navigate for post-submission redirect
    } catch (error) {
      console.error("Submission failed in view:", error);
      // Optionally show an error message to the user
      alert(`Submission failed: ${error.message || "Please try again."}`);
    }
  };

  // Handle loading and error states from the hook
  if (loading) {
    return (
        <div className="onboarding-host-div">
          <main className="container page-body" id="summary">
            <p>Loading summary data...</p>
          </main>
        </div>
    );
  }

  if (error || !data) {
    return (
        <div className="onboarding-host-div">
          <main className="container page-body" id="summary">
            <h2>Error Loading Summary</h2>
            <p>{error || "Could not load summary data. Please try going back and returning to this page."}</p>
            <Button routePath={`/hostonboarding/${accommodationType}/availability`} btnText="Go back" variant="secondary" />
          </main>
        </div>
    );
  }

  const type = data.type || "";
  const drafted = data.Drafted ?? true; // Default to true if undefined

  return (
      <div className="onboarding-host-div">
        <main className="container page-body" id="summary">
          <FetchUserId />
          <h2>Review your listing</h2>
          <p className="onboardingSectionSubtitle">Please check if everything is correct before submitting.</p>

          <SummaryTable data={data} type={type} />

          {(type === 'boat' || type === 'camper') && (
              <SpecificationsTable data={data} type={type} />
          )}

          {/* FeatureTable could be added here if needed */}
          {/* <FeatureTable features={data.Features} /> */}

          <DeclarationSection
              drafted={drafted}
              toggleDrafted={toggleDrafted} // For saving as draft
              declare={declare}
              toggleDeclare={() => setDeclare(!declare)} // For legal declaration
              confirm={confirm}
              toggleConfirm={() => setConfirm(!confirm)} // For confirming accuracy
          />

          <div className="onboarding-button-box">
            <Button
                // Go back to the previous step (Availability)
                routePath={`/hostonboarding/${type}/availability`}
                btnText="Go back to change"
                variant="secondary"
            />
            <Button
                onClick={handleSubmit}
                btnText="Confirm and Submit Listing"
                disabled={!declare || !confirm} // Disable until both boxes are checked
            />
          </div>
        </main>
      </div>
  );
}

export default SummaryViewAndSubmit;