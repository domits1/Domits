import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

export const useHouseRules = () => {
  const houseRules = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.houseRules,
  )
  const updateHouseRule = useFormStoreHostOnboarding(
    (state) => state.setHouseRule,
  )

  const handleCheckboxChange = (rule, value) => {
    updateHouseRule(rule, value)
  }

  const handleTimeChange = (rule, subKey, value) => {
    updateHouseRule(rule, value, subKey)
  }

  return { houseRules, handleCheckboxChange, handleTimeChange }
}
