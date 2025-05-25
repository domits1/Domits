import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

export const useAccommodationTitle = () => {
  const title = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.title,
  )
  const subtitle = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.subtitle,
  )
  const updateAccommodationDetail = useFormStoreHostOnboarding(
    (state) => state.updateAccommodationDetail,
  )

  const handleInputChange = (key, value) => {
    updateAccommodationDetail(key, value)
  }

  return { title, subtitle, handleInputChange }
}
