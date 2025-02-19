import { useNavigate } from "react-router-dom";
import useFormStore from "../stores/formStore";

export const useHandleAccommodationTypeProceed = () => {
  const navigate = useNavigate();
  const selectedType = useFormStore((state) => state.accommodationDetails.type);
  const markStepComplete = useFormStore((state) => state.markStepComplete);

  const handleProceed = () => {
    if (!selectedType) {
      return;
    }

    markStepComplete("type");

    navigate(`/hostonboarding/${selectedType}/name`);
  };

  return { handleProceed };
}