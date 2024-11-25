import { useNavigate } from "react-router-dom";
import useFormStore from "../stores/formStore";

export const useHandleLegalProceed = () => {
  const navigate = useNavigate();
  const selectedType = useFormStore((state) => state.accommodationDetails.type);

  const handleProceed = () => {
    if (!selectedType) {
      return;
    }

    if (["Villa", "House", "Apartment", "Cottage"].includes(selectedType)) {
      navigate("/hostonboarding/legal/registrationnumber");
    } else {
      navigate("/hostonboarding/next");
    }
  };

  return { handleProceed };
}