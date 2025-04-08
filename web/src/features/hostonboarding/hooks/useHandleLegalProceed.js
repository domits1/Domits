import { useNavigate } from "react-router-dom";
import useFormStore from "../stores/formStore";

export const useHandleLegalProceed = () => {
  console.log("useHandleLegalProceed");
  const navigate = useNavigate();
  const selectedType = useFormStore((state) => state.accommodationDetails.type);
  const handleProceed = () => {
    if (!selectedType) {
      return console.error("no property type selected");
    }

    console.error(validateAccommodationDetails());

    console.log("navigating", selectedType);

    if (["Villa", "House", "Apartment", "Cottage"].includes(selectedType)) {
      navigate("/hostonboarding/legal/registrationnumber");
    } else {
      navigate("/hostonboarding/summary");
    }
  };

  const validateAccommodationDetails = (details) => {
    const errors = [];

    if (!details.type) errors.push("Type is required");
    if (!details.title) errors.push("Title is required");
    if (!details.description) errors.push("Description is required");

    // if (Object.keys(details.images).length === 0)
    //   errors.push("At least one image required");

    return errors;
  };
  return { handleProceed };
};
