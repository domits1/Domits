// 12_SummarySubmitView.js
import React, { useState, useEffect } from "react"; // Added useState
// Remove useSummary import
import SummaryTable from "../components/SummaryTable";
import SpecificationsTable from "../components/SpecificationsTable";
import DeclarationSection from "../components/DeclarationSection";
import FetchUserId from "../utils/FetchUserId";
import { useNavigate } from "react-router-dom";
import { submitAccommodation } from "../services/SubmitAccommodation.js";
// Remove useFormStore import if not needed elsewhere
import { useBuilder } from "../../../context/propertyBuilderContext";
import { toast } from "react-toastify"; // For error handling

function SummaryViewAndSubmit() {
  const builder = useBuilder();
  const navigate = useNavigate();
  const [displayData, setDisplayData] = useState(null); // State for built data
  const [drafted, setDrafted] = useState(false); // Local state for draft? Or get from builder if stored there

  useEffect(() => {
    const builtData = builder.build();
    console.log("Data built for Summary View:", builtData); // Log the data being used
    if (builtData) {
      setDisplayData(builtData);
      // If draft status is part of the builder:
      // setDrafted(builtData.property?.isDraft ?? false);
    } else {
      // Handle case where build failed even before submit attempt
      console.error("Failed to build data on summary mount.");
      toast.error("Could not load summary data. Essential info might be missing.");
      // Optional: navigate back or show error state
    }
  }, [builder]); // Dependency on builder instance

  // Need a toggle function if DeclarationSection uses it
  const toggleDrafted = () => {
    setDrafted(prev => !prev);
    // If draft needs to be saved to builder:
    // builder.addProperty({ isDraft: !drafted }); // Requires isDraft in PropertyModel
  }

  const handleSubmit = () => {
    // Re-build here to ensure latest state (e.g., draft status) is included
    // If draft status is managed locally, update builder first:
    // builder.addProperty({ isDraft: drafted });
    const finalPayload = builder.build(); // Build the final payload
    console.log("Payload for submission:", finalPayload);

    if (finalPayload) {
      submitAccommodation(navigate, finalPayload); // Pass payload, not builder
    } else {
      toast.error("Cannot submit: Essential data missing in builder.");
      console.error("handleSubmit blocked because builder.build() returned null.");
    }
  };

  // Render loading or error state until data is ready
  if (!displayData) {
    return <div className="onboarding-host-div">Loading summary...</div>;
  }

  // Safely get the type AFTER displayData is confirmed to exist
  const type = displayData.propertyType?.property_type; // Use optional chaining

  return (
    <div className="onboarding-host-div">
      <div className="summary">
        <FetchUserId />
        <h2>Please check if everything is correct</h2>
        {/* Pass displayData to tables */}
        <SummaryTable data={displayData} type={type} />
        <SpecificationsTable data={displayData} type={type} />
        <DeclarationSection drafted={drafted} toggleDrafted={toggleDrafted} />
        <div className="onboarding-button-box">
          <button className="onboarding-button" onClick={() => navigate(-1)}> {/* Example: Go back */}
            Go back to change
          </button>
          <button className="onboarding-button" onClick={handleSubmit}>
            Confirm and proceed
          </button>
        </div>
      </div>
    </div>
  );
}

export default SummaryViewAndSubmit;