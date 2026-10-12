export const DEFAULT_FILTERS = {
    property: 'All properties',
    status: 'All statuses',
    assignee: 'Anyone',
    date: 'Any date',
    priority: 'Any priority',
    search: '',
};

export const getTodayString = () => new Date().toISOString().split('T')[0];

export const isTaskOverdue = (task, todayStr) => (
    Boolean(task?.dueDate) &&
    task.dueDate < todayStr &&
    task.status !== 'Completed' &&
    task.status !== 'Cancelled'
);

export const normalizeTaskStatus = (task, todayStr) => {
    if (isTaskOverdue(task, todayStr)) {
        return { ...task, status: 'Overdue' };
    }

    return task;
};

export const matchesFilterSelection = (selectedValue, defaultValue, taskValue) => (
    selectedValue === defaultValue || taskValue === selectedValue
);

export const matchesSearchFields = (task, searchTerm, searchFields) => {
    if (!searchTerm) {
        return true;
    }

    const searchLower = searchTerm.toLowerCase();
    return searchFields.some((field) => String(task?.[field] || '').toLowerCase().includes(searchLower));
};

export const matchesDateFilter = (task, dateFilter) => {
    if (dateFilter === DEFAULT_FILTERS.date) {
        return true;
    }

    if (dateFilter === 'Today') {
        return task.dueDate === getTodayString();
    }

    if (dateFilter === 'This Week' && task.dueDate) {
        const taskDate = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);

        return taskDate >= today && taskDate <= nextWeek;
    }

    return true;
};

export const matchesTaskFilters = (
    task,
    filters,
    {
        includeAssignee = false,
        includeDate = false,
        excludeLegacy = false,
        excludeCompleted = false,
        searchFields = ['title'],
    } = {}
) => {
    if (excludeLegacy && task.isLegacy) {
        return false;
    }

    if (excludeCompleted && task.status === 'Completed') {
        return false;
    }

    if (!matchesFilterSelection(filters.property, DEFAULT_FILTERS.property, task.property)) {
        return false;
    }

    if (!matchesFilterSelection(filters.status, DEFAULT_FILTERS.status, task.status)) {
        return false;
    }

    if (includeAssignee && !matchesFilterSelection(filters.assignee, DEFAULT_FILTERS.assignee, task.assignee)) {
        return false;
    }

    if (!matchesFilterSelection(filters.priority, DEFAULT_FILTERS.priority, task.priority)) {
        return false;
    }

    if (!matchesSearchFields(task, filters.search, searchFields)) {
        return false;
    }

    if (!includeDate) {
        return true;
    }

    return matchesDateFilter(task, filters.date);
};
