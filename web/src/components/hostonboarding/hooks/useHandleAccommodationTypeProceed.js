import { useNavigate } from "react-router-dom";
import useFormStore from "../stores/formStore";

export const useHandleAccommodationTypeProceed = () => {
  const navigate = useNavigate();
  const selectedType = useFormStore((state) => state.accommodationDetails.type);

  const handleProceed = () => {
    if (!selectedType) {
      return;
    }

    if (["Villa", "House", "Apartment", "Cottage"].includes(selectedType)) {
      navigate("/hostonboarding/accommodation");
    } else if (selectedType === "Boat") {
      navigate("/hostonboarding/boat");
    } else if (selectedType === "Camper") {
      navigate("/hostonboarding/camper");
    }
  };

  return { handleProceed };
}