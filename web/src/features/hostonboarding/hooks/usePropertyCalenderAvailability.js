import useFormStoreHostOnboarding from "../stores/formStoreHostOnboarding"

export const useAvailability = () => {
  const availability = useFormStoreHostOnboarding(
    (state) => state.accommodationDetails.availability,
  )
  const updateAvailability = useFormStoreHostOnboarding(
    (state) => state.updateAvailability,
  )
  const updateSelectedDates = useFormStoreHostOnboarding(
    (state) => state.updateSelectedDates,
  )

  const incrementAmount = (key, amount, maxLimit = Infinity) => {
    if (availability[key] + amount <= maxLimit) {
      updateAvailability(key, availability[key] + amount)
    }
  }

  const decrementAmount = (key, amount, minLimit = 0) => {
    if (availability[key] - amount >= minLimit) {
      updateAvailability(key, availability[key] - amount)
    }
  }

  return {
    availability,
    updateAvailability,
    updateSelectedDates,
    incrementAmount,
    decrementAmount,
  }
}
