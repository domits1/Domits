import useFormStore from '../stores/formStore'

export const useAvailability = () => {
  const availability = useFormStore(
    state => state.accommodationDetails.availability,
  )
  const updateAvailability = useFormStore(state => state.updateAvailability)
  const updateSelectedDates = useFormStore(state => state.updateSelectedDates)

  const incrementAmount = (key, maxLimit) => {
    if (availability[key] < maxLimit) {
      updateAvailability(key, availability[key] + 1)
    }
  }

  const decrementAmount = (key, minLimit = 1) => {
    if (availability[key] > minLimit) {
      updateAvailability(key, availability[key] - 1)
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
