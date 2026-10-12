import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import TableView from './TableView.js';

describe('TableView', () => {
    const todayStr = new Date().toISOString().split('T')[0];

    const task = {
        id: 't1', title: 'Clean the villa', property: 'Villa Sunshine', type: 'Cleaning',
        assignee: 'Alex Host', dueDate: todayStr, priority: 'Medium', status: 'Pending',
    };

    const baseProps = {
        filters: { property: 'All properties', status: 'All statuses', priority: 'Any priority', search: '' },
        filterPropertyOptions: ['Villa Sunshine'],
        sortConfig: { key: 'dueDate', direction: 'asc' },
        paginatedTasks: [task],
        totalResultsCount: 1,
        currentPage: 1,
        totalPages: 1,
        getPropertyLabel: (t) => t.property,
        onFilterChange: jest.fn(),
        onClearFilters: jest.fn(),
        onSort: jest.fn(),
        onTaskClick: jest.fn(),
        onPrevPage: jest.fn(),
        onNextPage: jest.fn(),
    };

    test('shows the empty state when there are no results', () => {
        render(<TableView {...baseProps} paginatedTasks={[]} totalResultsCount={0} />);
        expect(screen.getByText(/No tasks match your filters/)).toBeInTheDocument();
    });

    test('renders a task row with its fields, showing "Today" for a due date of today', () => {
        render(<TableView {...baseProps} />);
        const row = screen.getByText('Clean the villa').closest('tr');
        expect(within(row).getByText('Villa Sunshine')).toBeInTheDocument();
        expect(within(row).getByText('Today')).toBeInTheDocument();
    });

    test('marks a task overdue when its due date has passed, even without an explicit Overdue status', () => {
        const overdueTask = { ...task, dueDate: '2020-01-01', status: 'Pending' };
        render(<TableView {...baseProps} paginatedTasks={[overdueTask]} />);
        const row = screen.getByText('Clean the villa').closest('tr');
        expect(within(row).getByText('● Overdue')).toBeInTheDocument();
        expect(within(row).getByText('Urgent')).toBeInTheDocument();
    });

    test('shows an Auto badge for a task created by automation', () => {
        const autoTask = { ...task, source: 'automation' };
        render(<TableView {...baseProps} paginatedTasks={[autoTask]} />);
        const row = screen.getByText('Clean the villa').closest('tr');
        expect(within(row).getByText('Auto')).toBeInTheDocument();
    });

    test('does not show an Auto badge for a manually-created task', () => {
        render(<TableView {...baseProps} />);
        const row = screen.getByText('Clean the villa').closest('tr');
        expect(within(row).queryByText('Auto')).not.toBeInTheDocument();
    });

    test('calls onTaskClick when a row is clicked', () => {
        render(<TableView {...baseProps} />);
        fireEvent.click(screen.getByText('Clean the villa'));
        expect(baseProps.onTaskClick).toHaveBeenCalledWith(task);
    });

    test('calls onSort with the column key when a sortable header is clicked', () => {
        render(<TableView {...baseProps} />);
        fireEvent.click(screen.getByText('Property', { exact: false }));
        expect(baseProps.onSort).toHaveBeenCalledWith('property');
    });

    test('calls onClearFilters when the clear filters button is clicked', () => {
        render(<TableView {...baseProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
        expect(baseProps.onClearFilters).toHaveBeenCalledTimes(1);
    });

    test('disables Previous on the first page and Next on the last page', () => {
        render(<TableView {...baseProps} currentPage={1} totalPages={1} />);
        expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    });

    test('calls onNextPage/onPrevPage when pagination buttons are enabled', () => {
        render(<TableView {...baseProps} currentPage={2} totalPages={3} />);
        fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
        expect(baseProps.onPrevPage).toHaveBeenCalledTimes(1);
        expect(baseProps.onNextPage).toHaveBeenCalledTimes(1);
    });
});
