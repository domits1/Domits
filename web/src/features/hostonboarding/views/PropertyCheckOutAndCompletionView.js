import React from "react";
import { useSummary } from "../hooks/usePropertyCheckOutAndCompletion";
import SummaryTable from "../components/SummaryTable";
import SpecificationsTable from "../components/SpecificationsTable";
import FeatureTable from "../components/FeatureTable";
import DeclarationSection from "../components/DeclarationSection";
import useFormStore from "../stores/formStore";
import FetchUserId from "../utils/FetchUserId";
import { useNavigate } from "react-router-dom";

function SummaryView() {
    const { data, toggleDrafted } = useSummary();
    const type = data.type;
    const navigate = useNavigate();

    const submitAccommodation = useFormStore((state) => state.submitAccommodation);

    const handleSubmit = async () => {
        await submitAccommodation();
        navigate("/hostdashboard/listings");
    };

    return (
        <div className="container" id="summary">
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
                <button
                    className="onboarding-button"
                    onClick={handleSubmit}
                >
                    Confirm and proceed
                </button>
            </div>
        </div>
    );
}

export default SummaryView;