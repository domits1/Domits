import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MyTasksView from './MyTasksView.js';

describe('MyTasksView', () => {
    const currentUser = { name: 'Alex Host' };
    const todayStr = new Date().toISOString().split('T')[0];

    const baseProps = {
        currentUser,
        filters: { property: 'All properties', status: 'All statuses', priority: 'Any priority', search: '' },
        filterPropertyOptions: ['Villa Sunshine'],
        getPropertyLabel: (task) => task.property,
        onFilterChange: jest.fn(),
        onTaskClick: jest.fn(),
        onToggleComplete: jest.fn(),
    };

    test('shows the empty state when there are no tasks for today', () => {
        render(<MyTasksView {...baseProps} tasks={[]} />);
        expect(screen.getByText(/No tasks for today/)).toBeInTheDocument();
    });

    test('buckets tasks into Today, Overdue, and Upcoming', () => {
        const tasks = [
            { id: 't1', title: 'Due today', assignee: 'Alex Host', property: 'Villa Sunshine', dueDate: todayStr, status: 'Pending', isLegacy: false },
            { id: 't2', title: 'Overdue task', assignee: 'Alex Host', property: 'Villa Sunshine', dueDate: '2020-01-01', status: 'Pending', isLegacy: false },
            { id: 't3', title: 'Future task', assignee: 'Alex Host', property: 'Villa Sunshine', dueDate: '2099-01-01', status: 'Pending', isLegacy: false },
            { id: 't4', title: 'Someone else\'s task', assignee: 'Other User', property: 'Villa Sunshine', dueDate: todayStr, status: 'Pending', isLegacy: false },
        ];
        render(<MyTasksView {...baseProps} tasks={tasks} />);

        expect(screen.getByText('Due today')).toBeInTheDocument();
        expect(screen.getByText('Overdue task')).toBeInTheDocument();
        expect(screen.getByText('Future task')).toBeInTheDocument();
        expect(screen.queryByText("Someone else's task")).not.toBeInTheDocument();
    });

    test('calls onTaskClick when a task row is clicked', () => {
        const task = { id: 't1', title: 'Due today', assignee: 'Alex Host', property: 'Villa Sunshine', dueDate: todayStr, status: 'Pending', isLegacy: false };
        render(<MyTasksView {...baseProps} tasks={[task]} />);

        fireEvent.click(screen.getByText('Due today'));
        expect(baseProps.onTaskClick).toHaveBeenCalledWith(task);
    });

    test('calls onToggleComplete from the checkbox without also triggering onTaskClick', () => {
        const task = { id: 't1', title: 'Due today', assignee: 'Alex Host', property: 'Villa Sunshine', dueDate: todayStr, status: 'Pending', isLegacy: false };
        const onTaskClick = jest.fn();
        const onToggleComplete = jest.fn();
        render(<MyTasksView {...baseProps} tasks={[task]} onTaskClick={onTaskClick} onToggleComplete={onToggleComplete} />);

        fireEvent.click(screen.getByRole('checkbox'));
        expect(onToggleComplete).toHaveBeenCalledWith(task);
        expect(onTaskClick).not.toHaveBeenCalled();
    });

    test('overdue tasks show an Overdue marker instead of a checkbox', () => {
        const task = { id: 't2', title: 'Overdue task', assignee: 'Alex Host', property: 'Villa Sunshine', dueDate: '2020-01-01', status: 'Pending', isLegacy: false };
        render(<MyTasksView {...baseProps} tasks={[task]} />);

        expect(screen.getByText('⍉ Overdue')).toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });
});
