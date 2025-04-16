import React, { useEffect } from "react";
import { useSummary } from "../hooks/useSummary";
import SummaryTable from "../components/SummaryTable";
import SpecificationsTable from "../components/SpecificationsTable";
import DeclarationSection from "../components/DeclarationSection";
import FetchUserId from "../utils/FetchUserId";
import { useNavigate } from "react-router-dom";
import { submitAccommodation } from "../services/SubmitAccommodation.js";
import useFormStore from "../stores/formStoreHostOnboarding";

function SummaryViewAndSubmit() {
  const { data, toggleDrafted } = useSummary();
  const type = data.type;
  const navigate = useNavigate();

  const handleSubmit = () => {
    console.log(
      "response Promise of submitAccommodation: \n",
      submitAccommodation(navigate),
    );
  };

  useEffect(() => {
    console.log(useFormStore.getState());
  }, []);

  return (
    <div className="onboarding-host-div">
      <div className="summary">
        <FetchUserId />
        <h2>Please check if everything is correct</h2>
        <SummaryTable data={data} type={type} />
        <SpecificationsTable data={data} type={type} />
        {/* <FeatureTable features={data.Features} /> */}
        <DeclarationSection
          drafted={data.Drafted}
          toggleDrafted={toggleDrafted}
        />
        <div className="onboarding-button-box">
          <button
            className="onboarding-button"
            onClick={() => console.log("Go back")}
          >
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
