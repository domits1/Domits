import { matchesTaskFilters } from './taskFilters';

export const buildTasksCsvReport = ({ reportData, tasks, filters }) => {
    const now = new Date();
    const timeDisplay = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const lines = [];

    lines.push(
        'TASK REPORT SUMMARY',
        `Generated,${now.toLocaleDateString('en-GB')} ${timeDisplay}`,
        '',
        'KPI METRICS',
        `Completion Rate,${reportData.completionRate}%`,
        `Avg Completion Time,${reportData.avgCompletionTime}`,
        `Total Tasks,${reportData.total}`,
        `Completed,${reportData.completed}`,
        `Pending,${reportData.pending}`,
        `In Progress,${reportData.inProgress}`,
        `Overdue,${reportData.overdue}`,
        `Overdue This Week,${reportData.overdueThisWeek}`,
        '',
        'TASKS BY PROPERTY',
        'Property,Total,Completed,In Progress,Overdue'
    );

    reportData.byProperty.forEach(prop => {
        lines.push(`"${prop.label}",${prop.total},${prop.completed},${prop.inProgress},${prop.overdue}`);
    });

    lines.push(
        '',
        'TASK LIST',
        'Title,Status,Priority,Property,Assignee,Due Date'
    );
    const filtered = tasks.filter(t => matchesTaskFilters(t, filters, {
        includeAssignee: true,
        includeDate: true,
        excludeLegacy: true,
    }));
    filtered.forEach(t => {
        lines.push([
            `"${(t.title || '').replaceAll('"', '""')}"`,
            t.status || '',
            t.priority || '',
            `"${(t.property || '').replaceAll('"', '""')}"`,
            t.assignee || '',
            t.dueDate || '',
        ].join(','));
    });

    return lines.join('\n');
};
