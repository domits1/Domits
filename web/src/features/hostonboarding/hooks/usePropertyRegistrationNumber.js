import { useNavigate } from "react-router-dom";
import useFormStore from "../stores/formStore";

export const useHandleLegalProceed = () => {
  console.log("useHandleLegalProceed")
  const navigate = useNavigate();
  const selectedType = useFormStore((state) => state.accommodationDetails.type);
  const handleProceed = () => {
    if (!selectedType) {
      return console.error('no property type selected');
    }

    console.log("navigating", selectedType);

    if (["Villa", "House", "Apartment", "Cottage"].includes(selectedType)) {
      navigate("/hostonboarding/legal/registrationnumber");
    } else {
      navigate("/hostonboarding/summary");
    }
  };

  return { handleProceed };
}