import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

export const usePricing = () => {
  const pricing = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails,
  )
  const updatePricing = useFormStoreHostOnboarding(
    (state) => state.updatePricing,
  )
  const calculateServiceFee = useFormStoreHostOnboarding(
    (state) => state.calculateServiceFee,
  )

  return { pricing, updatePricing, calculateServiceFee }
}
