import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReportsView from './ReportsView.js';

// jsdom has no ResizeObserver; recharts' ResponsiveContainer needs one.
global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
};

describe('ReportsView', () => {
    const baseReportData = {
        completionRate: 75,
        completed: 3,
        total: 4,
        avgCompletionTime: '2h 0m',
        overdue: 1,
        overdueThisWeek: 1,
        pending: 1,
        inProgress: 1,
        timeData: [{ date: 'Mar 11', _sort: 1, pending: 1, progress: 1, completed: 1, overdue: 1 }],
        distributionData: [
            { name: 'Pending', value: 1, color: '#6c757d' },
            { name: 'In Progress', value: 1, color: '#0062cc' },
            { name: 'Completed', value: 3, color: '#1e7e34' },
            { name: 'Overdue', value: 1, color: '#dc3545' },
        ],
        byProperty: [
            { label: 'Villa Sunshine', total: 4, completed: 3, inProgress: 1, overdue: 1 },
        ],
    };

    const baseProps = {
        reportData: baseReportData,
        filters: { property: 'All properties', status: 'All statuses', priority: 'Any priority', assignee: 'Anyone', date: 'Any date', search: '' },
        filterPropertyOptions: ['Villa Sunshine'],
        assigneeOptions: ['Alex Host'],
        timeView: 'Weekly',
        onFilterChange: jest.fn(),
        onTimeViewChange: jest.fn(),
        onExportCSV: jest.fn(),
    };

    test('renders the KPI card values from reportData', () => {
        render(<ReportsView {...baseProps} />);
        expect(screen.getByText('75%')).toBeInTheDocument();
        expect(screen.getByText('2h 0m')).toBeInTheDocument();
        expect(screen.getByText('Completed 3 out of 4 tasks')).toBeInTheDocument();
    });

    test('renders the assignee filter options', () => {
        render(<ReportsView {...baseProps} />);
        expect(screen.getByRole('option', { name: 'Alex Host' })).toBeInTheDocument();
    });

    test('calls onExportCSV when the export button is clicked', () => {
        render(<ReportsView {...baseProps} />);
        fireEvent.click(screen.getByRole('button', { name: '↥ Export CSV' }));
        expect(baseProps.onExportCSV).toHaveBeenCalledTimes(1);
    });

    test('calls onTimeViewChange with the clicked option', () => {
        render(<ReportsView {...baseProps} />);
        fireEvent.click(screen.getByRole('button', { name: 'Daily' }));
        expect(baseProps.onTimeViewChange).toHaveBeenCalledWith('Daily');
    });

    test('renders a row per property in Tasks by Property', () => {
        const { container } = render(<ReportsView {...baseProps} />);
        expect(container.querySelector('.prop-name-cell')).toHaveTextContent('Villa Sunshine');
    });

    test('shows the empty state when no property matches the current filters', () => {
        render(<ReportsView {...baseProps} reportData={{ ...baseReportData, byProperty: [] }} />);
        expect(screen.getByText('No tasks match current filters.')).toBeInTheDocument();
    });
});
