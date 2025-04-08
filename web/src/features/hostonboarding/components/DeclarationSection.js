import React, { useState } from "react";
import { useSummary } from "../hooks/usePropertyCheckOutAndCompletion";
import SummaryTable from "../components/SummaryTable";
import SpecificationsTable from "../components/SpecificationsTable";
import DeclarationSection from "../components/DeclarationSection";
import useFormStore from "../stores/formStore";
import FetchUserId from "../utils/FetchUserId";
import { useNavigate } from "react-router-dom";

function SummaryView() {
    const { data, toggleDrafted } = useSummary();
    const type = data.type;
    const navigate = useNavigate();

    const submitAccommodation = useFormStore((state) => state.submitAccommodation);

    const [declare, setDeclare] = useState(false);
    const [confirm, setConfirm] = useState(false);

    const handleSubmit = async () => {
        if (!declare || !confirm) {
            alert("You must agree to the terms and declare the property is legitimate.");
            return;
        }
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
                declare={declare}
                toggleDeclareDrafted={() => setDeclare(!declare)}
                confirm={confirm}
                toggleConfirmDrafted={() => setConfirm(!confirm)}
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