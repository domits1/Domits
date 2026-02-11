// Inputs: arrival/departure can be timestamps (ms) or ISO date strings
export function calculateNights(arrival, departure) {
  try {
    const msPerDay = 1000 * 60 * 60 * 24;
    const arrivalMs = new Date(arrival).getTime();
    const departureMs = new Date(departure).getTime();

    if (Number.isNaN(arrivalMs) || Number.isNaN(departureMs)) {
      return 1;
    }

    const difference = departureMs - arrivalMs;
    const nights = Math.max(1, Math.ceil(difference / msPerDay));

    return nights;
  } catch (e) {
    return 1;
  }
}

export function calculateTotalPayment(rate, arrival, departure) {
  const nights = calculateNights(arrival, departure);
  const numericRate = Number(rate) || 0;
  return numericRate * nights;
}
