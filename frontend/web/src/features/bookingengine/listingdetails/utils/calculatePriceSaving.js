const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);

export const calculatePriceSaving = (bookingTotal, config) => {
  if (!isFiniteNumber(bookingTotal) || bookingTotal <= 0) {
    return null;
  }

  if (!config || !config.comparisonPlatformLabel) {
    return null;
  }

  const { domitsCommissionRate, comparisonCommissionRate, comparisonPlatformLabel } = config;

  if (!isFiniteNumber(domitsCommissionRate) || !isFiniteNumber(comparisonCommissionRate)) {
    return null;
  }

  if (domitsCommissionRate >= comparisonCommissionRate) {
    return null;
  }

  const saving = bookingTotal * (comparisonCommissionRate - domitsCommissionRate);
  const roundedSaving = Math.round(saving);

  if (roundedSaving <= 0) {
    return null;
  }

  return {
    amount: roundedSaving,
    platformLabel: comparisonPlatformLabel,
  };
};
