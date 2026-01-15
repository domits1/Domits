const pad = (n) => String(n).padStart(2, "0");

const toYmd = (d, useUTC) => {
  const dt = d instanceof Date ? d : new Date(d);
  if (useUTC) {
    return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
  }
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
};

const addDays = (d, n, useUTC) => {
  const x = new Date(d);
  if (useUTC) x.setUTCDate(x.getUTCDate() + n);
  else x.setDate(x.getDate() + n);
  return x;
};

const parseIcsDate = (raw) => {
  if (!raw) return { date: null, useUTC: false };

  const v = String(raw).trim();

  if (/^\d{8}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    return { date: new Date(y, m - 1, d), useUTC: false };
  }

  if (/^\d{8}T\d{6}Z$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    const hh = Number(v.slice(9, 11));
    const mm = Number(v.slice(11, 13));
    const ss = Number(v.slice(13, 15));
    return { date: new Date(Date.UTC(y, m - 1, d, hh, mm, ss)), useUTC: true };
  }

  if (/^\d{8}T\d{6}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    const hh = Number(v.slice(9, 11));
    const mm = Number(v.slice(11, 13));
    const ss = Number(v.slice(13, 15));
    return { date: new Date(y, m - 1, d, hh, mm, ss), useUTC: false };
  }

  const d = new Date(v);
  return { date: isNaN(d.getTime()) ? null : d, useUTC: false };
};

export function buildBlockedSetFromIcsEvents(events) {
  const set = new Set();
  const arr = Array.isArray(events) ? events : [];

  for (const e of arr) {
    const { date: start, useUTC: startUTC } = parseIcsDate(e?.Dtstart);
    const { date: end, useUTC: endUTC } = parseIcsDate(e?.Dtend);

    if (!start) continue;

    if (!end) {
      set.add(toYmd(start, startUTC));
      continue;
    }

    const useUTC = Boolean(startUTC || endUTC);

    const startDay = useUTC
      ? new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
      : new Date(start.getFullYear(), start.getMonth(), start.getDate());

    const endDay = useUTC
      ? new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))
      : new Date(end.getFullYear(), end.getMonth(), end.getDate());

    if (endDay.getTime() <= startDay.getTime()) {
      set.add(toYmd(startDay, useUTC));
      continue;
    }

    let cur = startDay;
    while (cur.getTime() < endDay.getTime()) {
      set.add(toYmd(cur, useUTC));
      cur = addDays(cur, 1, useUTC);
    }
  }

  return set;
}