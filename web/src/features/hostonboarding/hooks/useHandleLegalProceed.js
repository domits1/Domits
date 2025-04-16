import { useNavigate } from "react-router-dom"
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

export const useHandleLegalProceed = () => {
  console.log("Proceed button clicked.");
  const navigate = useNavigate()
  const selectedType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.type,
  )
  const handleProceed = () => {
    if (!selectedType) {
      return console.error("no property type selected");
    }

    if (["Villa", "House", "Apartment", "Cottage"].includes(selectedType)) {
      navigate("/hostonboarding/legal/registrationnumber");
    } else {
      navigate("/hostonboarding/summary");
    }
  };

  return { handleProceed };
};
