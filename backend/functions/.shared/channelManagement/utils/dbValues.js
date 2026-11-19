// Postgres returns count() and bigint values as strings, so raw query results are turned
// into numbers here, in one place.

export const toCount = (value) => Number(value ?? 0);

export const toTimeOrNull = (value) => (value === null || value === undefined ? null : Number(value));
