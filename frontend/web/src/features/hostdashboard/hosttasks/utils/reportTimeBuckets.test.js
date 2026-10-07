import { getIntervalKey, getSortTimestamp } from './reportTimeBuckets.js';

describe('getIntervalKey', () => {
    test('returns null for a falsy timestamp', () => {
        expect(getIntervalKey(null, 'Daily')).toBeNull();
        expect(getIntervalKey(0, 'Weekly')).toBeNull();
    });

    test('Daily view returns a single-day label', () => {
        const timestamp = new Date(2024, 2, 15).getTime(); // Friday, March 15 2024
        expect(getIntervalKey(timestamp, 'Daily')).toBe('Mar 15');
    });

    test('Weekly view returns a Monday-Sunday range label', () => {
        const timestamp = new Date(2024, 2, 15).getTime(); // Friday, March 15 2024
        expect(getIntervalKey(timestamp, 'Weekly')).toBe('Mar 11 – Mar 17');
    });
});

describe('getSortTimestamp', () => {
    test('returns 0 for a falsy timestamp', () => {
        expect(getSortTimestamp(null, 'Daily')).toBe(0);
    });

    test('Daily view returns the exact timestamp', () => {
        const timestamp = new Date(2024, 2, 15, 14, 30).getTime();
        expect(getSortTimestamp(timestamp, 'Daily')).toBe(timestamp);
    });

    test('Weekly view returns the start-of-week (Monday) timestamp', () => {
        const timestamp = new Date(2024, 2, 15, 14, 30).getTime(); // Friday
        const expectedMonday = new Date(2024, 2, 11, 0, 0, 0, 0).getTime();
        expect(getSortTimestamp(timestamp, 'Weekly')).toBe(expectedMonday);
    });
});
