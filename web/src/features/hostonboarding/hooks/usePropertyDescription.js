import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

export const useDescription = () => {
  const description = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.description,
  )
  const boatSpecifications = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.boatSpecifications,
  )
  const camperSpecifications = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.camperSpecifications,
  )

  const updateDescription = useFormStoreHostOnboarding(
    (state) => state.updateDescription,
  )
  const updateBoatSpecification = useFormStoreHostOnboarding(
    (state) => state.updateBoatSpecification,
  )
  const updateCamperSpecification = useFormStoreHostOnboarding(
    (state) => state.updateCamperSpecification,
  )

  return {
    description,
    boatSpecifications,
    camperSpecifications,
    updateDescription,
    updateBoatSpecification,
    updateCamperSpecification,
  }
}
