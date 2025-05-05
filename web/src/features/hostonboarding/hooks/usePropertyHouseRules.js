import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

export const useHouseRules = () => {
  const houseRules = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.houseRules,
  )
  const checkInOutData = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.checkIn
  )

  const updateHouseRule = useFormStoreHostOnboarding(
    (state) => state.setHouseRule,
  )

  const updateTimeRule = useFormStoreHostOnboarding(
    (state) => state.setCheckIn,
  )

  const handleCheckboxChange = (rule, value) => {
    updateHouseRule(rule, !!value);
  }

  const handleTimeChange = (rule, subKey, value) => {
    // Ensure subKey is lowercase 'from' or 'till' for setCheckIn action
    const lowerCaseSubKey = subKey.toLowerCase();
    console.log(`Updating time rule: ${rule}, ${lowerCaseSubKey}, ${value}`);
    if (typeof updateTimeRule === 'function') {
      // Call setCheckIn with the correct structure: rule ('CheckIn'/'CheckOut'), value, subKey ('from'/'till')
      updateTimeRule(rule, value, lowerCaseSubKey);
    } else {
      console.error("Zustand action 'setCheckIn' not found or not a function.");
    }
  }

  return { houseRules, checkInOutData, handleCheckboxChange, handleTimeChange }
}