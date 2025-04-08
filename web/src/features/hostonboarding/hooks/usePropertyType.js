import { useNavigate } from "react-router-dom"
import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

// move to next screen based on building/boat/camper
export const useHandleAccommodationTypeProceed = () => {
  const navigate = useNavigate()
  const selectedType = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.type,
  )
  const markStepComplete = useFormStoreHostOnboarding(
    (state) => state.markStepComplete,
  )

  const handleProceed = () => {
    if (!selectedType) {
      return
    }

    markStepComplete("type")

    if (["Villa", "House", "Apartment", "Cottage"].includes(selectedType)) {
      navigate("/hostonboarding/accommodation")
    } else if (selectedType === "Boat") {
      navigate("/hostonboarding/boat")
    } else if (selectedType === "Camper") {
      navigate("/hostonboarding/camper")
    }
  }

  return { handleProceed }
}
