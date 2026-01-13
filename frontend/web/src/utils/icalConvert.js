const pad = (n) => String(n).padStart(2, "0");

const toLocalYmd = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

const parseIcsDate = (raw) => {
  if (!raw) return null;

  const v = String(raw).trim();

  if (/^\d{8}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    return new Date(y, m - 1, d);
  }

  if (/^\d{8}T\d{6}Z$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    const hh = Number(v.slice(9, 11));
    const mm = Number(v.slice(11, 13));
    const ss = Number(v.slice(13, 15));
    return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
  }

  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export function buildBlockedSetFromIcsEvents(events) {
  const set = new Set();
  const arr = Array.isArray(events) ? events : [];

  for (const e of arr) {
    const start = parseIcsDate(e?.Dtstart);
    const end = parseIcsDate(e?.Dtend);

    if (!start) continue;

    if (!end) {
      set.add(toLocalYmd(start));
      continue;
    }

    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    if (endDay.getTime() <= startDay.getTime()) {
      set.add(toLocalYmd(startDay));
      continue;
    }

    let cur = startDay;
    while (cur.getTime() < endDay.getTime()) {
      set.add(toLocalYmd(cur));
      cur = addDays(cur, 1);
    }
  }

  return set;
}