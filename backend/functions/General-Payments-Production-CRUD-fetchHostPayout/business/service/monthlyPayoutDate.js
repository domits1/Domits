export function getNextMonthlyPayoutDate(monthlyAnchor, fromDate = new Date()) {
  if (
    !Number.isInteger(monthlyAnchor) ||
    monthlyAnchor < 1 ||
    monthlyAnchor > 31 ||
    !(fromDate instanceof Date) ||
    Number.isNaN(fromDate.getTime())
  ) {
    return null;
  }

  const year = fromDate.getUTCFullYear();
  const month = fromDate.getUTCMonth();
  const currentMonthLastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const currentMonthPayoutDay = Math.min(monthlyAnchor, currentMonthLastDay);
  const monthOffset = fromDate.getUTCDate() < currentMonthPayoutDay ? 0 : 1;
  const targetMonth = new Date(Date.UTC(year, month + monthOffset, 1));
  const targetYear = targetMonth.getUTCFullYear();
  const targetMonthIndex = targetMonth.getUTCMonth();
  const targetMonthLastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate();

  return new Date(Date.UTC(targetYear, targetMonthIndex, Math.min(monthlyAnchor, targetMonthLastDay)));
}
