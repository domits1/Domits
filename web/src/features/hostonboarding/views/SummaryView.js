import React from "react";
import { useSummary } from "../hooks/useSummary";
import SummaryTable from "../components/SummaryTable";
import SpecificationsTable from "../components/SpecificationsTable";
import FeatureTable from "../components/FeatureTable";
import DeclarationSection from "../components/DeclarationSection";

function SummaryView() {
  const { data, toggleDrafted } = useSummary();
  const type = data.Type || "Accommodation";

  return (
    <div className="container" id="summary">
      <h2>Please check if everything is correct</h2>
      <SummaryTable data={data} type={type} />
      <SpecificationsTable data={data} type={type} />
      <FeatureTable features={data.Features} />
      <DeclarationSection drafted={data.Drafted} toggleDrafted={toggleDrafted} />
      <div className="onboarding-button-box">
        <button
          className="onboarding-button"
          onClick={() => console.log("Go back")}
        >
          Go back to change
        </button>
        <button
          className="onboarding-button"
          onClick={() => console.log("Confirm and proceed")}
        >
          Confirm and proceed
        </button>
      </div>
    </div>
  );
}

export default SummaryView;
