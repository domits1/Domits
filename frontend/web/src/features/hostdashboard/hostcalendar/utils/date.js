// UTC-safe helpers so month edges don't shift across timezones.
export const startOfMonthUTC = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
export const addMonthsUTC = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
export const subMonthsUTC = (d, n) => addMonthsUTC(d, -n);

export const isSameMonthUTC = (a, b) =>
  a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();

export const toKey = (d) => {
  const y = d.getUTCFullYear();
  const m = `${d.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${d.getUTCDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getMonthMatrix = (cursor) => {
  const first = startOfMonthUTC(cursor);
  const firstDay = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
  const startWeekDay = (firstDay.getUTCDay() + 6) % 7; 
  const start = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1 - startWeekDay));
  const matrix = [];
  for (let w = 0; w < 6; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(start);
      date.setUTCDate(start.getUTCDate() + (w * 7 + d));
      row.push(date);
    }
    matrix.push(row);
  }
  return matrix;
};

export const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const monthNames = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export const formatYearMonth = (d) =>
  `${monthNames[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
