// --- START OF FILE useProperyRate.js ---

import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

export const usePricing = () => {
  // Get the specific slice of state (accommodationDetails which contains pricing info)
  const pricing = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails,
  )
  // Get the action to update pricing details in the store
  const updatePricing = useFormStoreHostOnboarding(
    (state) => state.updatePricing, // Assumes this action exists in the store
  )
  // Get the action to calculate the service fee (presumably updates state)
  const calculateServiceFee = useFormStoreHostOnboarding(
    (state) => state.calculateServiceFee, // Assumes this action exists
  )

  // Return the state slice and actions needed by the component
  return { pricing, updatePricing, calculateServiceFee }
}

// --- END OF FILE useProperyRate.js ---