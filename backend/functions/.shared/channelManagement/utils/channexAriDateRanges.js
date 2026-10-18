const DAY_MS = 24 * 60 * 60 * 1000;

const isNextDay = (previousIsoDate, isoDate) => Date.parse(isoDate) - Date.parse(previousIsoDate) === DAY_MS;

// Two values belong in one range only when everything but the date is equal; sorting the
// keys makes the comparison independent of the order the fields were added in.
const sameValuesKey = (value) => {
  const { date, ...rest } = value;
  return JSON.stringify(Object.keys(rest).sort().map((key) => [key, rest[key]]));
};

const toChannexValue = (run) => {
  if (run.values.length === 1) return run.values[0];
  const { date, ...rest } = run.values[0];
  return { ...rest, date_from: date, date_to: run.values.at(-1).date };
};

// Channex wants consecutive dates with the same values sent as one date_from/date_to range
// instead of one object per date (certification feedback, 12 Oct 2026).
export const compactChannexValuesToDateRanges = (values) => {
  const list = Array.isArray(values) ? values : [];
  const singleDates = list.filter((value) => typeof value?.date === "string");
  const others = list.filter((value) => typeof value?.date !== "string");

  const runs = [];
  const sorted = [...singleDates].sort((a, b) => a.date.localeCompare(b.date));
  for (const value of sorted) {
    const key = sameValuesKey(value);
    const run = runs.findLast((candidate) => candidate.key === key);
    if (run && isNextDay(run.values.at(-1).date, value.date)) {
      run.values.push(value);
    } else {
      runs.push({ key, values: [value] });
    }
  }

  return [...others, ...runs.map(toChannexValue)];
};
