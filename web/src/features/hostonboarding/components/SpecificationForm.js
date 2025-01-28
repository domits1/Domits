import React from "react";
import LabeledInput from "./LabeledInput";
import RadioGroup from "./RadioGroup";

function SpecificationForm({ type, specifications, updateSpecification }) {
  return (
    <div className="specification-form">
      {type == "boat" ? (
        <>
          <h1>General</h1>
          <RadioGroup
            label="Are you a professional?"
            name="isPro"
            options={["Yes", "No"]}
            selectedValue={specifications.isPro ? "Yes" : "No"}
            onChange={(value) => updateSpecification("isPro", value === "Yes")}
          />
          <LabeledInput
            label="Manufacturer*"
            value={specifications.Manufacturer || ""}
            onChange={(value) => updateSpecification("Manufacturer", value)}
            placeholder="Enter the manufacturer of your boat"
          />
          <LabeledInput
            label="Model*"
            value={specifications.Model || ""}
            onChange={(value) => updateSpecification("Model", value)}
            placeholder="Enter the name of the model"
          />
          <RadioGroup
            label="Is your boat rented with a skipper?"
            name="RentedWithSkipper"
            options={["Yes", "No"]}
            selectedValue={specifications.RentedWithSkipper ? "Yes" : "No"}
            onChange={(value) =>
              updateSpecification("RentedWithSkipper", value === "Yes")
            }
          />
          <RadioGroup
            label="Does your boat need a boating license?"
            name="HasLicense"
            options={["Yes", "No"]}
            selectedValue={specifications.HasLicense ? "Yes" : "No"}
            onChange={(value) =>
              updateSpecification("HasLicense", value === "Yes")
            }
          />
          <LabeledInput
            label="General periodic inspection*"
            type="date"
            value={specifications.GPI || ""}
            onChange={(value) => updateSpecification("GPI", value)}
            placeholder="DD/MM/YYYY"
          />
          <h1>Technical</h1>
          <LabeledInput
            label="Capacity (allowed)"
            value={specifications.Capacity || ""}
            onChange={(value) => updateSpecification("Capacity", value)}
            placeholder="0"
          />
          <LabeledInput
            label="Length (m)"
            value={specifications.Length || ""}
            onChange={(value) => updateSpecification("Length", value)}
            placeholder="0"
          />
          <LabeledInput
            label="Fuel (L/h)"
            value={specifications.FuelTank || ""}
            onChange={(value) => updateSpecification("FuelTank", value)}
            placeholder="0"
          />
          <LabeledInput
            label="Top speed (Km)"
            value={specifications.Speed || ""}
            onChange={(value) => updateSpecification("Speed", value)}
            placeholder="0"
          />
          <LabeledInput
            label="Year of construction"
            type="number"
            value={specifications.YOC || ""}
            onChange={(value) => updateSpecification("YOC", value)}
            min={1900}
            max={new Date().getFullYear()}
            placeholder="YYYY"
          />
          <LabeledInput
            label="Renovated"
            type="number"
            value={specifications.Renovated || ""}
            onChange={(value) => updateSpecification("Renovated", value)}
            min={1900}
            max={new Date().getFullYear()}
            placeholder="YYYY"
          />
        </>
      ) : type == "camper" ? (
        <>
          <RadioGroup
            label="Category"
            name="Category"
            options={["Small Camper", "Medium Camper", "Large Camper"]} // Replace with camperCategories if dynamic
            selectedValue={specifications.Category || ""}
            onChange={(value) => updateSpecification("Category", value)}
          />
          <LabeledInput
            label="License plate*"
            value={specifications.LicensePlate || ""}
            onChange={(value) => updateSpecification("LicensePlate", value)}
            placeholder="Enter the characters of your license plate"
          />
          <LabeledInput
            label="Brand*"
            value={specifications.CamperBrand || ""}
            onChange={(value) => updateSpecification("CamperBrand", value)}
            placeholder="Enter the brand of your camper"
          />
          <LabeledInput
            label="Model*"
            value={specifications.Model || ""}
            onChange={(value) => updateSpecification("Model", value)}
            placeholder="Enter the name of the model"
          />
          <LabeledInput
            label="Required driver’s license"
            value={specifications.Requirement || ""}
            onChange={(value) => updateSpecification("Requirement", value)}
            placeholder="Select the required license type"
          />
          <LabeledInput
            label="General periodic inspection*"
            type="date"
            value={specifications.GPI || ""}
            onChange={(value) => updateSpecification("GPI", value)}
            placeholder="DD/MM/YYYY"
          />
          <h1>Technical</h1>
          <LabeledInput
            label="Length (m)"
            value={specifications.Length || ""}
            onChange={(value) => updateSpecification("Length", value)}
            placeholder="0"
          />
          <LabeledInput
            label="Height (m)"
            value={specifications.Height || ""}
            onChange={(value) => updateSpecification("Height", value)}
            placeholder="0"
          />
          <LabeledInput
            label="Transmission"
            value={specifications.Transmission || ""}
            onChange={(value) => updateSpecification("Transmission", value)}
            placeholder="Manual or Automatic"
          />
          <LabeledInput
            label="Fuel (L/h)"
            value={specifications.FuelTank || ""}
            onChange={(value) => updateSpecification("FuelTank", value)}
            placeholder="0"
          />
          <LabeledInput
            label="Year of construction"
            type="number"
            value={specifications.YOC || ""}
            onChange={(value) => updateSpecification("YOC", value)}
            min={1900}
            max={new Date().getFullYear()}
            placeholder="YYYY"
          />
          <LabeledInput
            label="Renovated"
            type="number"
            value={specifications.Renovated || ""}
            onChange={(value) => updateSpecification("Renovated", value)}
            min={1900}
            max={new Date().getFullYear()}
            placeholder="YYYY"
          />
          <h1>Additional Features</h1>
          <div className="checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={specifications.FWD || false}
                onChange={(e) => updateSpecification("FWD", e.target.checked)}
              />
              4 x 4 Four-Wheel Drive
            </label>
            <label>
              <input
                type="checkbox"
                checked={specifications.SelfBuilt || false}
                onChange={(e) =>
                  updateSpecification("SelfBuilt", e.target.checked)
                }
              />
              My camper is self-built
            </label>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default SpecificationForm;
