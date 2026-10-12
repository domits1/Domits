import { buildTasksCsvReport } from './taskCsvExport.js';
import { DEFAULT_FILTERS } from './taskFilters.js';

describe('buildTasksCsvReport', () => {
    const reportData = {
        completionRate: 50,
        avgCompletionTime: '2h 0m',
        total: 2,
        completed: 1,
        pending: 1,
        inProgress: 0,
        overdue: 0,
        overdueThisWeek: 0,
        byProperty: [
            { label: 'Villa Sunshine', total: 2, completed: 1, inProgress: 0, overdue: 0 },
        ],
    };

    const tasks = [
        { title: 'Clean the villa', status: 'Completed', priority: 'Medium', property: 'Villa Sunshine', assignee: 'Alex', dueDate: '2024-03-01', isLegacy: false },
        { title: 'Inspect the pool', status: 'Pending', priority: 'High', property: 'Villa Sunshine', assignee: 'Sam', dueDate: '2024-03-05', isLegacy: false },
    ];

    test('includes the KPI summary block', () => {
        const csv = buildTasksCsvReport({ reportData, tasks, filters: DEFAULT_FILTERS });
        expect(csv).toContain('Completion Rate,50%');
        expect(csv).toContain('Total Tasks,2');
    });

    test('includes a row per property in the by-property block', () => {
        const csv = buildTasksCsvReport({ reportData, tasks, filters: DEFAULT_FILTERS });
        expect(csv).toContain('"Villa Sunshine",2,1,0,0');
    });

    test('includes a row per task, filtered and quoted', () => {
        const csv = buildTasksCsvReport({ reportData, tasks, filters: DEFAULT_FILTERS });
        expect(csv).toContain('"Clean the villa",Completed,Medium,"Villa Sunshine",Alex,2024-03-01');
        expect(csv).toContain('"Inspect the pool",Pending,High,"Villa Sunshine",Sam,2024-03-05');
    });

    test('excludes legacy tasks from the task list', () => {
        const withLegacy = [...tasks, { title: 'Old task', status: 'Completed', priority: 'Low', property: 'Villa Sunshine', assignee: 'Alex', dueDate: '2023-01-01', isLegacy: true }];
        const csv = buildTasksCsvReport({ reportData, tasks: withLegacy, filters: DEFAULT_FILTERS });
        expect(csv).not.toContain('Old task');
    });
});
