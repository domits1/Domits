import React from "react";
import LabeledInput from "./LabeledInput";
import RadioGroup from "./RadioGroup";
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding";
import { toast } from "react-toastify";

function SpecificationForm({ type, specifications, updateSpecification }) {
  const technicalDetails = useFormStoreHostOnboarding((state) => state.technicalDetails);
  const updateTechnicalDetails = useFormStoreHostOnboarding((state) => state.updateTechnicalDetails);
  return (
    <div className="specification-form">
      <>
        <h1>General</h1>
        <LabeledInput
          label="General periodic inspection*"
          type="date"
          value={
            typeof technicalDetails.generalPeriodicInspection === "number"
              ? new Date(technicalDetails.generalPeriodicInspection).toISOString().split("T")[0]
              : ""
          }
          onChange={(event) => {
            const dateValue = event.target.value
            updateTechnicalDetails(
              "generalPeriodicInspection",
              dateValue ? new Date(dateValue).getTime() : null
            )
          }}
        />
        <h1>Technical</h1>
        <LabeledInput
          label="Top speed (Km)"
          type="number"
          value={technicalDetails.speed}
          onChange={(event) => {
            const value = event.target.value;
            if (isNaN(parseFloat(value))) {
              toast.error("Top speed must be a number");
            } else {
              updateTechnicalDetails("speed", parseFloat(value));
              console.log(technicalDetails)
            }
          }}
          placeholder="0"
        />
        <LabeledInput
          label="Length (m)"
          type="number"
          value={technicalDetails.length}
          onChange={(event) => {
            const value = event.target.value;
            if (isNaN(parseFloat(value))) {
              toast.error("Length must be a number");
            } else {
              updateTechnicalDetails("length", parseFloat(value));
            }
          }}
          placeholder="0"
        />
        <LabeledInput
          label="Height (m)"
          type="number"
          value={technicalDetails.height}
          onChange={(event) => {
            const value = event.target.value;
            if (isNaN(parseFloat(value))) {
              toast.error("Height must be a number");
            } else {
              updateTechnicalDetails("height", parseFloat(value));
            }
          }}
          placeholder="0"
        />
        <LabeledInput
          label="Fuel (L/h)"
          type="number"
          value={technicalDetails.fuelConsumption}
          onChange={(event) => {
            const value = event.target.value;
            if (isNaN(parseFloat(value))) {
              toast.error("Fuel consumption must be a number");
            } else {
              updateTechnicalDetails("fuelConsumption", parseFloat(value));
            }
          }}
          placeholder="0"
        />
        <LabeledInput
          label="Renovated"
          type="number"
          value={technicalDetails.renovationYear}
          onChange={(event) => {
            const value = event.target.value;
            if (isNaN(parseFloat(value))) {
              toast.error("Renovation year must be a number");
            } else {
              updateTechnicalDetails("renovationYear", parseFloat(value));
            }
          }}
          min={1900}
          max={new Date().getFullYear()}
          placeholder="YYYY"
        />
        {type === "Camper" && (
          <>
            <LabeledInput
              label="Transmission"
              value={technicalDetails.transmission}
              onChange={(event) => updateTechnicalDetails("transmission", event.target.value)}
              placeholder="Manual or Automatic"
            />
            <h1>Additional Features</h1>
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={technicalDetails.fourWheelDrive}
                  onChange={(event) => updateTechnicalDetails("fourWheelDrive", event.target.checked)}
                />
                4 x 4 Four-Wheel Drive
              </label>
            </div>
          </>
        )}
      </>
    </div>
  );
}

export default SpecificationForm;
