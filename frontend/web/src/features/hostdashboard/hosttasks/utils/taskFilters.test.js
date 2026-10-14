import {
    DEFAULT_FILTERS,
    isTaskOverdue,
    normalizeTaskStatus,
    matchesFilterSelection,
    matchesSearchFields,
    matchesDateFilter,
    matchesTaskFilters,
} from './taskFilters.js';

describe('isTaskOverdue', () => {
    test('true when due date is in the past and not completed or cancelled', () => {
        expect(isTaskOverdue({ dueDate: '2020-01-01', status: 'Pending' }, '2020-06-01')).toBe(true);
    });

    test('false when the task is Completed', () => {
        expect(isTaskOverdue({ dueDate: '2020-01-01', status: 'Completed' }, '2020-06-01')).toBe(false);
    });

    test('false when the task is Cancelled', () => {
        expect(isTaskOverdue({ dueDate: '2020-01-01', status: 'Cancelled' }, '2020-06-01')).toBe(false);
    });

    test('false when there is no due date', () => {
        expect(isTaskOverdue({ dueDate: null, status: 'Pending' }, '2020-06-01')).toBe(false);
    });
});

describe('normalizeTaskStatus', () => {
    test('relabels an overdue task as Overdue without mutating the original', () => {
        const task = { dueDate: '2020-01-01', status: 'Pending' };
        const result = normalizeTaskStatus(task, '2020-06-01');
        expect(result).toEqual({ dueDate: '2020-01-01', status: 'Overdue' });
        expect(task.status).toBe('Pending');
    });

    test('returns the task unchanged when not overdue', () => {
        const task = { dueDate: '2020-12-01', status: 'Pending' };
        expect(normalizeTaskStatus(task, '2020-06-01')).toBe(task);
    });
});

describe('matchesFilterSelection', () => {
    test('matches when the filter is the default (no filter applied)', () => {
        expect(matchesFilterSelection('All properties', 'All properties', 'Villa Sunshine')).toBe(true);
    });

    test('matches when the task value equals the selected value', () => {
        expect(matchesFilterSelection('Villa Sunshine', 'All properties', 'Villa Sunshine')).toBe(true);
    });

    test('does not match a different selected value', () => {
        expect(matchesFilterSelection('Villa Sunshine', 'All properties', 'Villa Ibiza')).toBe(false);
    });
});

describe('matchesSearchFields', () => {
    test('matches everything when the search term is empty', () => {
        expect(matchesSearchFields({ title: 'Clean the pool' }, '', ['title'])).toBe(true);
    });

    test('matches case-insensitively across the given fields', () => {
        expect(matchesSearchFields({ title: 'Clean the POOL' }, 'pool', ['title'])).toBe(true);
    });

    test('does not match when no field contains the term', () => {
        expect(matchesSearchFields({ title: 'Clean the pool' }, 'garden', ['title'])).toBe(false);
    });
});

describe('matchesDateFilter', () => {
    test('passes everything for the default "Any date"', () => {
        expect(matchesDateFilter({ dueDate: '2099-01-01' }, DEFAULT_FILTERS.date)).toBe(true);
    });

    test('"Today" only matches the current day', () => {
        const todayStr = new Date().toISOString().split('T')[0];
        expect(matchesDateFilter({ dueDate: todayStr }, 'Today')).toBe(true);
        expect(matchesDateFilter({ dueDate: '2020-01-01' }, 'Today')).toBe(false);
    });
});

describe('matchesTaskFilters', () => {
    const baseTask = { property: 'Villa Sunshine', status: 'Pending', priority: 'Medium', title: 'Clean the villa', isLegacy: false };

    test('excludes a task that does not match the property filter', () => {
        const filters = { ...DEFAULT_FILTERS, property: 'Villa Ibiza' };
        expect(matchesTaskFilters(baseTask, filters)).toBe(false);
    });

    test('excludes legacy tasks when excludeLegacy is set', () => {
        const task = { ...baseTask, isLegacy: true };
        expect(matchesTaskFilters(task, DEFAULT_FILTERS, { excludeLegacy: true })).toBe(false);
    });

    test('excludes completed tasks when excludeCompleted is set', () => {
        const task = { ...baseTask, status: 'Completed' };
        expect(matchesTaskFilters(task, DEFAULT_FILTERS, { excludeCompleted: true })).toBe(false);
    });

    test('matches a task against default filters with no exclusions', () => {
        expect(matchesTaskFilters(baseTask, DEFAULT_FILTERS)).toBe(true);
    });
});
