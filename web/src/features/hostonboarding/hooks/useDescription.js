import useFormStore from '../stores/formStore'

export const useDescription = () => {
  const description = useFormStore(
    state => state.accommodationDetails.description,
  )
  const boatSpecifications = useFormStore(
    state => state.accommodationDetails.boatSpecifications,
  )
  const camperSpecifications = useFormStore(
    state => state.accommodationDetails.camperSpecifications,
  )

  const updateDescription = useFormStore(state => state.updateDescription)
  const updateBoatSpecification = useFormStore(
    state => state.updateBoatSpecification,
  )
  const updateCamperSpecification = useFormStore(
    state => state.updateCamperSpecification,
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
