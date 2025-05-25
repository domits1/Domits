import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

export const useHouseRules = () => {
  const houseRules = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.houseRules,
  )

  const updateHouseRule = useFormStoreHostOnboarding(
    (state) => state.setHouseRule,
  )

  const updateCheckIn = useFormStoreHostOnboarding(
    (state) => state.setCheckIn,
  )

  const checkIn = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.checkIn,
  )

  const handleCheckboxChange = (rule, value) => {
    updateHouseRule(rule, value)
  }

  const handleTimeChange = (rule, subKey, value) => {
    updateCheckIn(rule, value, subKey)
  }

  return { houseRules, checkIn, handleCheckboxChange, handleTimeChange }
}
