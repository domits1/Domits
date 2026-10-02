import { sortTasks } from './taskSort.js';

describe('sortTasks', () => {
    test('sorts by priority rank ascending', () => {
        const tasks = [{ priority: 'Low' }, { priority: 'Urgent' }, { priority: 'Medium' }];
        const result = sortTasks(tasks, { key: 'priority', direction: 'asc' });
        expect(result.map(t => t.priority)).toEqual(['Low', 'Medium', 'Urgent']);
    });

    test('sorts by priority rank descending', () => {
        const tasks = [{ priority: 'Low' }, { priority: 'Urgent' }, { priority: 'Medium' }];
        const result = sortTasks(tasks, { key: 'priority', direction: 'desc' });
        expect(result.map(t => t.priority)).toEqual(['Urgent', 'Medium', 'Low']);
    });

    test('sorts by dueDate ascending, with missing due dates last', () => {
        const tasks = [{ dueDate: '2024-03-01' }, { dueDate: null }, { dueDate: '2024-01-01' }];
        const result = sortTasks(tasks, { key: 'dueDate', direction: 'asc' });
        expect(result.map(t => t.dueDate)).toEqual(['2024-01-01', '2024-03-01', null]);
    });

    test('sorts by a generic string field case-insensitively', () => {
        const tasks = [{ title: 'banana' }, { title: 'Apple' }, { title: 'cherry' }];
        const result = sortTasks(tasks, { key: 'title', direction: 'asc' });
        expect(result.map(t => t.title)).toEqual(['Apple', 'banana', 'cherry']);
    });

    test('does not mutate the input array', () => {
        const tasks = [{ priority: 'Low' }, { priority: 'Urgent' }];
        sortTasks(tasks, { key: 'priority', direction: 'asc' });
        expect(tasks.map(t => t.priority)).toEqual(['Low', 'Urgent']);
    });
});
