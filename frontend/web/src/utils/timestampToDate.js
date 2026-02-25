export function timestampToDate(value) {
  if (value == null) return null;

  const numericValue = Number(value);
  if (Number.isFinite(numericValue)) {
    const milliseconds =
      String(Math.trunc(numericValue)).length <= 10
        ? numericValue * 1000
        : numericValue;
    const parsed = new Date(milliseconds);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
