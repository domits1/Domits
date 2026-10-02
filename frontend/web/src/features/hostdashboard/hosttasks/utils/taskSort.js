export const PRIORITY_RANK = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };

export const sortTasks = (tasksToSort, sortConfig) => {
    return [...tasksToSort].sort((a, b) => {
        const modifier = sortConfig.direction === 'asc' ? 1 : -1;

        if (sortConfig.key === 'priority') {
            const aVal = PRIORITY_RANK[a.priority] || 0;
            const bVal = PRIORITY_RANK[b.priority] || 0;
            return (aVal - bVal) * modifier;
        }
        if (sortConfig.key === 'dueDate') {
            const aDate = a.dueDate ? new Date(a.dueDate).getTime() : new Date('9999-12-31').getTime();
            const bDate = b.dueDate ? new Date(b.dueDate).getTime() : new Date('9999-12-31').getTime();
            return (aDate - bDate) * modifier;
        }
        const aStr = (a[sortConfig.key] || '').toString().toLowerCase();
        const bStr = (b[sortConfig.key] || '').toString().toLowerCase();

        if (aStr < bStr) return -1 * modifier;
        if (aStr > bStr) return 1 * modifier;
        return 0;
    });
};
