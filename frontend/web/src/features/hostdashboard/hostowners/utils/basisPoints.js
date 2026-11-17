export const TOTAL_BASIS_POINTS = 10000;

const BASIS_POINTS_PER_PERCENT = 100;
const PERCENT_PATTERN = /^(\d{1,3})(?:\.(\d{1,2}))?$/;

const toPercentText = (percent) => {
  if (typeof percent === "number") {
    return Number.isFinite(percent) ? String(percent) : null;
  }
  return typeof percent === "string" ? percent.trim() : null;
};

export const percentToBasisPoints = (percent) => {
  const text = toPercentText(percent);
  const match = text === null ? null : PERCENT_PATTERN.exec(text);
  if (!match) {
    return null;
  }
  const [, whole, fraction = ""] = match;
  const basisPoints = Number(whole) * BASIS_POINTS_PER_PERCENT + Number(fraction.padEnd(2, "0"));
  return basisPoints <= TOTAL_BASIS_POINTS ? basisPoints : null;
};

export const basisPointsToPercent = (basisPoints) => {
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints > TOTAL_BASIS_POINTS) {
    return null;
  }
  return basisPoints / BASIS_POINTS_PER_PERCENT;
};

export const addsUpToTotal = (basisPointsList) =>
  Array.isArray(basisPointsList) &&
  basisPointsList.every((basisPoints) => Number.isSafeInteger(basisPoints) && basisPoints >= 0) &&
  basisPointsList.reduce((sum, basisPoints) => sum + basisPoints, 0) === TOTAL_BASIS_POINTS;
