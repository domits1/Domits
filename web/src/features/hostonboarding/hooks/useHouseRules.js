import useFormStore from '../stores/formStore'

export const useHouseRules = () => {
  const houseRules = useFormStore(
    state => state.accommodationDetails.houseRules,
  )
  const updateHouseRule = useFormStore(state => state.setHouseRule)

  const handleCheckboxChange = (rule, value) => {
    updateHouseRule(rule, value)
  }

  const handleTimeChange = (rule, subKey, value) => {
    updateHouseRule(rule, value, subKey)
  }

  return {houseRules, handleCheckboxChange, handleTimeChange}
}
