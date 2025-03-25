import useFormStore from "../stores/formStore";

export const useAvailability = () => {
  const availability = useFormStore(
    (state) => state.accommodationDetails.availability
  );
  const updateAvailability = useFormStore((state) => state.updateAvailability);
  const updateSelectedDates = useFormStore(
    (state) => state.updateSelectedDates
  );

  const incrementAmount = (key, amount, maxLimit = Infinity) => {
    if (availability[key] + amount <= maxLimit) {
      updateAvailability(key, availability[key] + amount);
    }
  };

  const decrementAmount = (key, amount, minLimit = 0) => {
    if (availability[key] - amount >= minLimit) {
      updateAvailability(key, availability[key] - amount);
    }
  };

  return {
    availability,
    updateAvailability,
    updateSelectedDates,
    incrementAmount,
    decrementAmount,
  };
};
