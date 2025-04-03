import React from "react";
import { useParams } from "react-router-dom";
import TextAreaField from "../components/TextAreaField";
import { useAccommodationTitle } from "../hooks/usePropertyName";
import Button from "../components/button";

function AccommodationTitleView() {
    const { type: accommodationType } = useParams();
    const { title, subtitle, handleInputChange } = useAccommodationTitle();
    const isProceedDisabled = !title.trim() || !subtitle.trim();

    return (
        <main className="container">
            <h2 className="onboardingSectionTitle">Name your accommodation</h2>
            <p className="onboardingSectionSubtitle">
                A short title works best. Don&apos;t worry, you can always change it later.
            </p>

            <TextAreaField
                value={title}
                onChange={(value) => handleInputChange("title", value)}
                maxLength={128}
                placeholder="Enter your title here..."
            />

            <h2 className="onboardingSectionTitle">Give it a suitable subtitle</h2>

            <TextAreaField
                value={subtitle}
                onChange={(value) => handleInputChange("subtitle", value)}
                maxLength={128}
                placeholder="Enter your subtitle here..."
            />

            <nav className="onboarding-button-box">
                <Button
                    routePath={`/hostonboarding/${accommodationType}`}
                    btnText="Go back"
                />
                <Button
                    routePath={`/hostonboarding/${accommodationType}/address`}
                    btnText="Proceed"
                    disabled={isProceedDisabled}
                    className={isProceedDisabled ? "button-disabled" : ""}
                />
            </nav>
        </main>
    );
}

export default AccommodationTitleView;