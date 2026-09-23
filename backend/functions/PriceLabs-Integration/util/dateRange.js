const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_RANGE_DAYS = 366;

export function validateDateRange(startDate, endDate) {
  if (!DATE_FORMAT.test(startDate) || !DATE_FORMAT.test(endDate)) {
    throw Object.assign(new Error("startDate and endDate must be in YYYY-MM-DD format"), { status: 400 });
  }

  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  const endMs = Date.parse(`${endDate}T00:00:00Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    throw Object.assign(new Error("startDate and endDate must be valid dates"), { status: 400 });
  }

  if (startMs > endMs) {
    throw Object.assign(new Error("startDate must not be after endDate"), { status: 400 });
  }

  const rangeDays = (endMs - startMs) / (24 * 60 * 60 * 1000) + 1;
  if (rangeDays > MAX_RANGE_DAYS) {
    throw Object.assign(new Error(`Date range must not exceed ${MAX_RANGE_DAYS} days`), { status: 400 });
  }
}
