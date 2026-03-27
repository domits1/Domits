import React, { useState, useEffect, useMemo } from 'react';
import './Housekeeping.css';
import { fetchTasks, createTask, updateTask, deleteTask } from './services/taskService';
import { fetchHostTaskPropertyOptions } from './services/hostTaskPropertyService';

const DEFAULT_FILTERS = {
    property: 'All properties',
    status: 'All statuses',
    assignee: 'Anyone',
    date: 'Any date',
    priority: 'Any priority',
    search: '',
};

const DEFAULT_NEW_TASK = {
    title: '',
    description: '',
    property: '',
    property_id: '',
    bookingRef: '',
    type: 'Cleaning',
    assignee: '',
    dueDate: '',
    priority: 'Medium',
    attachments: null,
};

const CURRENT_USER = 'Sophie Janssen';

const getTodayString = () => new Date().toISOString().split('T')[0];

const isTaskOverdue = (task, todayStr) => (
    Boolean(task?.dueDate) &&
    task.dueDate < todayStr &&
    task.status !== 'Completed' &&
    task.status !== 'Cancelled'
);

const normalizeTaskStatus = (task, todayStr) => {
    if (isTaskOverdue(task, todayStr)) {
        return { ...task, status: 'Overdue' };
    }

    return task;
};

const matchesFilterSelection = (selectedValue, defaultValue, taskValue) => (
    selectedValue === defaultValue || taskValue === selectedValue
);

const matchesSearchFields = (task, searchTerm, searchFields) => {
    if (!searchTerm) {
        return true;
    }

    const searchLower = searchTerm.toLowerCase();
    return searchFields.some((field) => String(task?.[field] || '').toLowerCase().includes(searchLower));
};

const matchesDateFilter = (task, dateFilter) => {
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

const matchesTaskFilters = (
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

const HostPropertyCare = () => {
    const [activeTab, setActiveTab] = useState('Overview'); 
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState({ total: 0, overdue: 0, overdueIncrease: 0, inProgress: 0, completedToday: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'dueDate', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);

    const [newTask, setNewTask] = useState({ ...DEFAULT_NEW_TASK });

    const [viewingTask, setViewingTask] = useState(null);
    const [editedTask, setEditedTask] = useState(null);  

    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel', onConfirm: null
    });

    const CURRENT_USER = 'Sophie Janssen';

    const [propertyOptions, setPropertyOptions] = useState([]);

    useEffect(() => {
        fetchHostTaskPropertyOptions().then(setPropertyOptions);
    }, []);
    
    const handleToggleComplete = async (task) => {
        const now = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const todayStr = new Date().toISOString().split('T')[0];

        const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';

        const updatedTask = {
            ...task,
            status: newStatus,
            completedAt: newStatus === 'Completed' ? todayStr : null,
            activities: [
                ...(task.activities || []),
                { id: Date.now(), user: CURRENT_USER, action: `marked task ${newStatus}`, timestamp: now }
            ]
        };

        setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));

        try {
            await updateTask(task.id, { status: newStatus });
        } catch {
            setTasks(tasks.map(t => t.id === task.id ? task : t));
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, sortConfig, activeTab]);

    useEffect(() => {
        const today = new Date();
        const todayStr = getTodayString();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const activeTasks = tasks.filter(t => !t.isLegacy);

        const newStats = {
            total: activeTasks.length,
            overdue: activeTasks.filter(t => t.status === 'Overdue' || isTaskOverdue(t, todayStr)).length,
            overdueIncrease: activeTasks.filter(t => t.dueDate === yesterdayStr && t.status !== 'Completed').length,
            inProgress: activeTasks.filter(t => t.status === 'In progress').length,
            completedToday: activeTasks.filter(t => t.status === 'Completed' && t.completedAt === todayStr).length
        };
        setStats(newStats);
    }, [tasks]);

    const loadData = async () => {
        setIsLoading(true);
        const data = await fetchTasks();
        
        const todayStr = new Date().toISOString().split('T')[0];
        const processedTasks = data.map(task => {
            if (task.dueDate && task.dueDate < todayStr && task.status !== 'Completed' && task.status !== 'Cancelled') {
                return { ...task, status: 'Overdue', priority: 'Urgent' };
            }
            return task;
        });

        setTasks(processedTasks);
        setIsLoading(false);
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            const now = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            const taskPayload = { 
                ...newTask, 
                status: 'Pending',
                activities: [{
                    id: Date.now(),
                    user: 'User',
                    action: 'created the task',
                    timestamp: now
                }]
            }; 
            
            let created = await createTask(taskPayload);
            
            const todayStr = new Date().toISOString().split('T')[0];
            if (created.dueDate && created.dueDate < todayStr && created.status !== 'Completed' && created.status !== 'Cancelled') {
                created = { ...created, status: 'Overdue', priority: 'Urgent' };
            }

            setTasks([created, ...tasks]);
            setIsModalOpen(false);
            resetForm();
        } catch {
            alert("Error creating task");
            console.error("Error creating task:", error);
        };
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewTask(prev => ({ ...prev, [name]: value }));
    };

    const handlePropertyChange = (e) => {
        const selected = createPropertyOptions.find(o => o.id === e.target.value);
        setNewTask(prev => ({
            ...prev,
            property_id: selected?.id || '',
            property: selected?.label || '',
        }));
    };

    const handleEditPropertyChange = (e) => {
        const selected = editPropertyOptions.find(o => o.id === e.target.value);
        setEditedTask(prev => ({
            ...prev,
            property_id: selected?.id || prev.property_id,
            property: selected?.label || '',
        }));
    };

    const resetForm = () => {
        setNewTask({ ...DEFAULT_NEW_TASK });
    };

    const handleCancelModal = () => {
        const hasUnsavedChanges = newTask.title || newTask.description || newTask.property || newTask.bookingRef || newTask.assignee || newTask.dueDate || newTask.priority !== 'Medium' || newTask.attachments;
        if (hasUnsavedChanges) {
            setConfirmDialog({
                isOpen: true,
                title: 'Discard unsaved changes?',
                message: 'You have unsaved changes in your new task. Are you sure you want to cancel and lose your progress?',
                confirmText: 'Discard Task',
                cancelText: 'Keep Editing',
                onConfirm: () => {
                    setIsModalOpen(false);
                    resetForm();
                    closeConfirmDialog();
                }
            });
        } else {
            setIsModalOpen(false);
            resetForm();
        }
    };

    const openTaskDetails = (task) => {
        setViewingTask(task);
        setEditedTask({ ...task }); 
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditedTask(prev => ({ ...prev, [name]: value }));
    };

    const closeTaskDetails = () => {
        const isEdited = JSON.stringify(viewingTask) !== JSON.stringify(editedTask);
        if (isEdited) {
            setConfirmDialog({
                isOpen: true,
                title: 'Discard edits?',
                message: 'You have unsaved changes. Are you sure you want to close without saving?',
                confirmText: 'Discard Changes',
                cancelText: 'Keep Editing',
                onConfirm: () => {
                    setViewingTask(null);
                    setEditedTask(null);
                    closeConfirmDialog();
                }
            });
        } else {
            setViewingTask(null);
            setEditedTask(null);
        }
    };

    const handleSaveChanges = async () => {
        const now = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const newLogs = [];

        if (viewingTask.status !== editedTask.status) {
            newLogs.push({ id: Date.now() + 1, user: 'User', action: `changed status to ${editedTask.status}`, timestamp: now });
        }
        if (viewingTask.assignee !== editedTask.assignee) {
            newLogs.push({ id: Date.now() + 2, user: 'User', action: `reassigned task to ${editedTask.assignee}`, timestamp: now });
        }
        if (viewingTask.dueDate !== editedTask.dueDate) {
            newLogs.push({ id: Date.now() + 3, user: 'User', action: `changed due date to ${editedTask.dueDate}`, timestamp: now });
        }
        if (viewingTask.priority !== editedTask.priority) {
            newLogs.push({ id: Date.now() + 4, user: 'User', action: `changed priority to ${editedTask.priority}`, timestamp: now });
        }
        if (viewingTask.property !== editedTask.property) {
            newLogs.push({ id: Date.now() + 6, user: 'User', action: `moved task to ${editedTask.property}`, timestamp: now });
        }
        
        if (newLogs.length === 0 && JSON.stringify(viewingTask) !== JSON.stringify(editedTask)) {
            newLogs.push({ id: Date.now() + 5, user: 'User', action: `updated task details`, timestamp: now });
        }

        const updatedTask = {
            ...editedTask,
            activities: [...(editedTask.activities || []), ...newLogs]
        };

        setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
        setViewingTask(null);
        setEditedTask(null);

        try {
            await updateTask(updatedTask.id, updatedTask);
        } catch {
            setTasks(tasks.map(t => t.id === viewingTask.id ? viewingTask : t));
        }
    };

    const confirmDeleteTask = async (taskId) => {
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, isLegacy: true } : t
        ));
        setViewingTask(null);
        setEditedTask(null);
        closeConfirmDialog();

        try {
            await deleteTask(taskId);
        } catch {
            setTasks(prev => prev.map(t =>
                t.id === taskId ? { ...t, isLegacy: false } : t
            ));
        }
    };

    const handleDeleteSingleTask = () => {
        setConfirmDialog({
            isOpen: true,
            title: 'Delete Task?',
            message: `Are you sure you want to delete "${viewingTask.title}"? It will be moved to your Legacy Tasks list.`,
            confirmText: 'Yes, Delete',
            cancelText: 'Cancel',
            onConfirm: () => confirmDeleteTask(viewingTask.id),
        });
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleClearFilters = () => {
        setFilters({ ...DEFAULT_FILTERS });
    };
    const renderCommonFilters = () => (
        <>
            <select name="property" value={filters.property} onChange={handleFilterChange}>
                <option value="All properties">All properties</option>
                {filterPropertyOptions.map(label => (
                    <option key={label} value={label}>{label}</option>
                ))}
            </select>
            <select name="status" value={filters.status} onChange={handleFilterChange}>
                <option value="All statuses">All statuses</option>
                <option value="Pending">Pending</option>
                <option value="In progress">In progress</option>
            </select>
        </>
    );

    const getFilteredTasks = () => {
        return tasks.filter((task) => matchesTaskFilters(task, filters, {
            includeAssignee: true,
            includeDate: true,
            excludeLegacy: true,
            excludeCompleted: true,
            searchFields: ['title', 'property', 'assignee'],
        }));
    };

    const filteredTasks = getFilteredTasks();

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedTasks = (tasksToSort) => {
        return [...tasksToSort].sort((a, b) => {
            const modifier = sortConfig.direction === 'asc' ? 1 : -1;

            if (sortConfig.key === 'priority') {
                const priorityValues = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
                const aVal = priorityValues[a.priority] || 0;
                const bVal = priorityValues[b.priority] || 0;
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

    const displayedTasks = getSortedTasks(filteredTasks);
    const closeConfirmDialog = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    const filterPropertyOptions = useMemo(() => {
        const labelSet = new Set(propertyOptions.map(o => o.label));

        tasks.forEach((task) => {
            const normalizedProperty = String(task?.property || "").trim();
            if (normalizedProperty) {
                labelSet.add(normalizedProperty);
            }
        });

        [newTask.property, editedTask?.property].forEach((value) => {
            const normalizedValue = String(value || "").trim();
            if (normalizedValue) {
                labelSet.add(normalizedValue);
            }
        });

        return [...labelSet];
    }, [editedTask?.property, propertyOptions, newTask.property, tasks]);

    const createPropertyOptions = useMemo(() => propertyOptions, [propertyOptions]);

    const editPropertyOptions = useMemo(() => {
        const currentLabel = String(editedTask?.property || "").trim();
        if (currentLabel && !propertyOptions.some(o => o.label === currentLabel)) {
            return [...propertyOptions, { id: editedTask?.property_id || "", label: currentLabel }];
        }
        return propertyOptions;
    }, [propertyOptions, editedTask?.property, editedTask?.property_id]);

    const ITEMS_PER_PAGE = 10;
    const totalPages = Math.ceil(displayedTasks.length / ITEMS_PER_PAGE) || 1;

    let paginatedTasks = [];
    if (activeTab === 'Overview') {
        paginatedTasks = displayedTasks.slice(0, ITEMS_PER_PAGE);
    } else {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        paginatedTasks = displayedTasks.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }

    const handlePrevPage = () => setCurrentPage(p => Math.max(p - 1, 1));
    const handleNextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));

    const renderContent = () => {
        if (isLoading) return <div className="loading">Loading...</div>;

        switch (activeTab) {
            case 'Overview':
            case 'All Tasks': 
                return renderTableView();
            case 'My Tasks':
                return renderMyTasksView();
            case 'Reports':
                return <div className="placeholder-view">Coming soon</div>;
            case 'Settings':
                return <div className="placeholder-view">Coming soon</div>;
            default:
                return null;
        }
    };
    const renderMyTasksView = () => {
        const todayStr = new Date().toISOString().split('T')[0];

        let myTasks = tasks.filter(t => t.assignee === CURRENT_USER && !t.isLegacy);

        myTasks = myTasks.filter(task => {
            const matchProperty = filters.property === 'All properties' || task.property === filters.property;
            const matchStatus = filters.status === 'All statuses' || task.status === filters.status;
            const matchPriority = filters.priority === 'Any priority' || task.priority === filters.priority;
            const searchLower = filters.search.toLowerCase();
            const matchSearch = filters.search === '' || (task.title?.toLowerCase().includes(searchLower));
            return matchProperty && matchStatus && matchPriority && matchSearch;
        });

        const todayTasks = myTasks.filter(t => t.dueDate === todayStr && t.status !== 'Overdue');
        const overdueTasks = myTasks.filter(t => t.status === 'Overdue' || (t.dueDate && t.dueDate < todayStr && t.status !== 'Completed'));
        
        const upcomingTasks = myTasks.filter(t => t.dueDate && t.dueDate > todayStr)
            .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
            .map(t => ({ ...t, priority: t.priority || 'Low', status: t.status || 'Pending' }));

        const renderTaskRow = (task, isOverdueSection = false) => {
            const displayPriority = isOverdueSection ? 'Urgent' : (task.priority || 'Low');
            const displayStatus = isOverdueSection ? 'Overdue' : task.status;
            
            const isCompleted = task.status === 'Completed';
            let displayTime = `Due ${task.dueDate}`;
            if (isOverdueSection) {
                displayTime = 'Overdue';
            } else if (task.dueDate === todayStr) {
                displayTime = 'Today';
            }
            return (
                <button 
                    type="button"
                    key={task.id} 
                    className={`my-task-card ${isOverdueSection ? 'is-overdue-card' : ''}`} 
                    onClick={() => openTaskDetails(task)}
                    style={{ opacity: isCompleted ? 0.6 : 1 }}
                >
                    <div className="my-task-left">
                        <div className="my-task-icon">📋</div>
                        <div className="my-task-info">
                            <h4>{task.title}</h4>
                            <span>{task.property}</span>
                        </div>
                    </div>
                    
                    <div className="my-task-middle">
                        <span className="my-task-time">
                            {displayTime}
                        </span>
                    </div>

                    <div className="my-task-right">
                        <span className={`badge-status ${displayStatus.toLowerCase().replace(' ', '-')}`}>
                            ● {displayStatus}
                        </span>
                        <span className={`badge-priority ${displayPriority.toLowerCase()}`}>
                            {displayPriority}
                        </span>
                        
                        {isOverdueSection ? (
                            <div className="overdue-action-text">⍉ Overdue</div>
                        ) : (
                            <input 
                                type="checkbox" 
                                className="my-task-checkbox" 
                                checked={task.status === 'Completed'}
                                onClick={(e) => e.stopPropagation()} 
                                onChange={() => handleToggleComplete(task)}
                            />
                        )}
                    </div>
                </button>
            );
        };

        return (
            <div className="my-tasks-container">
                <div className="my-tasks-section">
                    <div className="section-header-row">
                        <div className="section-title">
                            <h3>Today's Tasks</h3>
                            <span className="task-count">{todayTasks.length} Tasks</span>
                        </div>
                        <div className="my-tasks-filters">
                            {renderCommonFilters()}
                            <select name="priority" value={filters.priority} onChange={handleFilterChange}>
                                <option value="Any priority">Any priority</option>
                                <option value="Urgent">Urgent</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                            <div className="search-box small-search">
                                <input type="text" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search tasks" />
                                <span aria-hidden="true">🔍</span>
                            </div>
                        </div>
                    </div>
                    <div className="my-task-list">
                        {todayTasks.length > 0 ? todayTasks.map(t => renderTaskRow(t)) : <p className="empty-state">No tasks for today! 🎉</p>}
                    </div>
                </div>

                <div className="my-tasks-section">
                    <div className="section-title">
                        <h3>Overdue</h3>
                        <span className="task-count">{overdueTasks.length} Task(s)</span>
                    </div>
                    <div className="my-task-list">
                        {overdueTasks.length > 0 ? overdueTasks.map(t => renderTaskRow(t, true)) : null}
                    </div>
                </div>

                <div className="my-tasks-section">
                    <div className="section-title">
                        <h3>Upcoming</h3>
                        <span className="task-count">{upcomingTasks.length} Task(s)</span>
                    </div>
                    <div className="my-task-list">
                        {upcomingTasks.length > 0 ? upcomingTasks.map(t => renderTaskRow(t)) : null}
                    </div>
                </div>
            </div>
        );
    };
    const getSortIcon = (columnKey, defaultIcon = '') => {
        if (sortConfig.key !== columnKey) return defaultIcon;
        return sortConfig.direction === 'asc' ? '▴' : '▾';
    };

    const renderPagination = () => (
        <div className="pagination">
            <button onClick={handlePrevPage} disabled={currentPage === 1}>Previous</button>
            <span>Page {currentPage} of {totalPages}</span>
            <button onClick={handleNextPage} disabled={currentPage === totalPages}>Next</button>
        </div>
    );

    const renderTableView = () => (
        <div className="overview-container">
            <div className="filters-bar">
                <div className="filters-dropdowns">
                    {renderCommonFilters()}
                    <select name="priority" value={filters.priority} onChange={handleFilterChange}>
                        <option value="Any priority">Any priority</option>
                        <option value="Urgent">Urgent</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                    <div className="search-box small-search">
                        <input type="text" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search tasks" />
                        <span aria-hidden="true">🔍</span>
                    </div>
                </div>

                <div className="active-filters-row">
                    <div className="status-tags">
                        <span className="status-tag"><span className="dot dot-pending"></span> Pending</span>
                        <span className="status-tag"><span className="dot dot-inprogress"></span> In progress</span>
                        <span className="status-tag"><span className="dot dot-completed"></span> Completed</span>
                        <span className="status-tag"><span className="dot dot-overdue"></span> Overdue</span>
                        <span className="status-tag"><span className="dot dot-cancelled"></span> Cancelled</span>
                    </div>
                    <button className="btn-clear-filters" onClick={handleClearFilters}>Clear filters</button>
                </div>
            </div>

            <div className="table-container">
                <table className="tasks-table">
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('title')} className="sortable-header">
                                Task {getSortIcon('title', '')}
                            </th>
                            <th onClick={() => handleSort('property')} className="sortable-header">
                                Property {getSortIcon('property', '▾')}
                            </th>
                            <th onClick={() => handleSort('type')} className="sortable-header">
                                Type {getSortIcon('type', '')}
                            </th>
                            <th onClick={() => handleSort('assignee')} className="sortable-header">
                                Assignee {getSortIcon('assignee', '')}
                            </th>
                            <th onClick={() => handleSort('dueDate')} className="sortable-header">
                                Due Date {getSortIcon('dueDate', '▾')}
                            </th>
                            <th onClick={() => handleSort('priority')} className="sortable-header">
                                Priority {getSortIcon('priority', '▾')}
                            </th>
                            <th onClick={() => handleSort('status')} className="sortable-header">
                                Status {getSortIcon('status', '▾')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedTasks.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{textAlign: 'center', padding: '30px', color: '#495057'}}>
                                    No tasks match your filters (or all are completed/deleted).
                                </td>
                            </tr>
                        ) : (
                            paginatedTasks.map(task => {
                                const isOverdue = task.status === 'Overdue' || isTaskOverdue(task, getTodayString());
                                const displayPriority = isOverdue ? 'Urgent' : (task.priority || 'Low');
                                const displayStatus = isOverdue ? 'Overdue' : task.status;

                                return (
                                <tr key={task.id} className={`clickable-row row-${displayStatus.toLowerCase().replace(' ', '-')}`} onClick={() => openTaskDetails(task)}>
                                    <td>
                                        <div className="task-title-cell" title={task.title}>
                                            <span className="task-arrow">▶</span> 
                                            <div className="truncate-text">
                                                <strong>{task.title}</strong>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{task.property}</td>
                                    <td>{task.type}</td>
                                    <td>{task.assignee}</td>
                                    <td>{task.dueDate === new Date().toISOString().split('T')[0] ? 'Today' : task.dueDate}</td>
                                    <td>
                                        <span className={`badge-priority ${displayPriority.toLowerCase()}`}>
                                            {displayPriority}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge-status ${displayStatus.toLowerCase().replace(' ', '-')}`}>
                                            ● {displayStatus}
                                        </span>
                                    </td>
                                </tr>
                            )})
                        )}
                    </tbody>
                </table>
                {renderPagination()}
            </div>
        </div>
    );

    return (
        <main className="task-dashboard-v2">
            <div className="top-header">
                <h2>Tasks</h2>
                <button className="btn-create-green" onClick={() => setIsModalOpen(true)}>
                    + Create Task
                </button>
            </div>

            <div className="tabs-nav">
                {['Overview', 'My Tasks', 'All Tasks', 'Reports', 'Settings'].map(tab => (
                    <button 
                        key={tab} 
                        className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'Overview' && (
                <div className="overview-stats-row">
                    <div className="overview-stat-card">
                        <div className="overview-stat-icon">📋</div>
                        <div className="overview-stat-info">
                            <span className="overview-stat-label">Total Tasks</span>
                            <span className="overview-stat-value">{stats.total}</span>
                        </div>
                    </div>
                    <div className="overview-stat-card">
                        <div className="overview-stat-icon error-icon">!</div>
                        <div className="overview-stat-info">
                            <span className="overview-stat-label">Overdue</span>
                            <span className="overview-stat-value">
                                {stats.overdue} 
                                {stats.overdueIncrease > 0 && (
                                    <small> (+{stats.overdueIncrease} since yesterday)</small>
                                )}
                            </span>
                        </div>
                    </div>
                    <div className="overview-stat-card">
                        <div className="overview-stat-icon info-icon">↻</div>
                        <div className="overview-stat-info">
                            <span className="overview-stat-label">In Progress</span>
                            <span className="overview-stat-value">{stats.inProgress}</span>
                        </div>
                    </div>
                    <div className="overview-stat-card">
                        <div className="overview-stat-icon success-icon">✓</div>
                        <div className="overview-stat-info">
                            <span className="overview-stat-label">Completed Today</span>
                            <span className="overview-stat-value">{stats.completedToday}</span>
                        </div>
                    </div>
                </div>
            )}

            <div className="content-area">
                {renderContent()}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-large">
                        <div className="modal-header">
                            <h3>Create Task</h3>
                            <button className="close-btn" onClick={handleCancelModal}>✕</button>
                        </div>
                        <form onSubmit={handleCreateTask}>
                            <div className="form-group">
                                <label htmlFor='task-title'>Title</label>
                                <input type="text" id='task-title' name="title" value={newTask.title} onChange={handleInputChange} placeholder="Repair broken patio light" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor='task-description'>Description</label>
                                <textarea id='task-description' name="description" value={newTask.description} onChange={handleInputChange} placeholder="Description here..." rows="3" required />
                            </div>
                            <div className="form-group">
                                <label htmlFor='task-property'>Property</label>
                                <select id='task-property' name="property" value={newTask.property_id} onChange={handlePropertyChange} required>
                                    <option value="" disabled hidden>Select Property</option>
                                    {createPropertyOptions.map(o => (
                                        <option key={o.id} value={o.id}>{o.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor='task-booking-ref'>Booking Reference (optional)</label>
                                <input type="text" id='task-booking-ref' name="bookingRef" value={newTask.bookingRef} onChange={handleInputChange} placeholder="Select booking." />
                            </div>
                            <div className="form-group">
                                <label htmlFor='task-type'>Type</label>
                                <div className="radio-group">
                                    <label><input type="radio" id='task-type-cleaning' name="type" value="Cleaning" checked={newTask.type === 'Cleaning'} onChange={handleInputChange} /> Cleaning</label>
                                    <label><input type="radio" id='task-type-maintenance' name="type" value="Maintenance" checked={newTask.type === 'Maintenance'} onChange={handleInputChange} /> Maintenance</label>
                                    <label><input type="radio" id='task-type-inspection' name="type" value="Inspection" checked={newTask.type === 'Inspection'} onChange={handleInputChange} /> Inspection</label>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor='task-assignee'>Assignee</label>
                                <select id='task-assignee' name="assignee" value={newTask.assignee} onChange={handleInputChange} required>
                                    <option value="" disabled hidden>Select Assignee</option>
                                    <option value="Sophie Janssen">Sophie Janssen (sophie@domits.com)</option>
                                    <option value="Jan de Vries">Jan de Vries (jan@domits.com)</option>
                                    <option value="Lisa Meijer">Lisa Meijer (lisa@domits.com)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor='task-due-date'>Due Date</label>
                                <input type="date" id='task-due-date' name="dueDate" value={newTask.dueDate} onChange={handleInputChange} onClick={(e) => e.target.showPicker?.()} required />
                            </div>
                            <div className="form-group">
                                <label htmlFor='task-priority'>Priority</label>
                                <select id='task-priority' name="priority" value={newTask.priority} onChange={handleInputChange} required>
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor='task-attachments'>Attachments (optional)</label>
                                <div className="custom-file-upload">
                                    <input type="file" id="file-upload" />
                                    <label htmlFor="file-upload">
                                        <span className="upload-text">Upload file...</span>
                                    </label>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                                <button type="button" className="btn-text" onClick={handleCancelModal}>Cancel</button>
                                <button type="submit" className="btn-create-green">Create Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {viewingTask && editedTask && (
                <div className="modal-overlay">
                    <div className="modal-content-large task-details-modal">
                        <div className="modal-header details-header">
                            <input
                                className="details-title-input"
                                name="title"
                                value={editedTask.title}
                                onChange={handleEditChange}
                                placeholder="Task title"
                            />
                            <button className="close-btn" onClick={closeTaskDetails}>✕</button>
                        </div>
                        
                        <div className="details-badges-row">
                            <select name="status" value={editedTask.status} onChange={handleEditChange} className={`badge-select status-${editedTask.status.toLowerCase().replace(' ', '-')}`}>
                                <option value="Pending">● Pending</option>
                                <option value="In progress">● In progress</option>
                                <option value="Completed">● Completed</option>
                                <option value="Overdue">● Overdue</option>
                            </select>
                            <select name="priority" value={editedTask.priority} onChange={handleEditChange} className={`badge-select priority-${editedTask.priority.toLowerCase()}`}>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                            <select name="property" value={editedTask.property_id || ''} onChange={handleEditPropertyChange} className="badge-select property-badge">
                                {editPropertyOptions.map((o) => (
                                    <option key={o.id} value={o.id}>🏢 {o.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="details-body">
                            <div className="form-group">
                                <label htmlFor='task-description'>Description</label>
                                <textarea id='task-description' name="description" value={editedTask.description || ''} onChange={handleEditChange} rows="3" placeholder="Enter description..." />
                            </div>

                            <div className="form-row-grid">
                                <div className="form-group">
                                    <label htmlFor='task-assignee'>Assignee</label>
                                    <select id='task-assignee' name="assignee" value={editedTask.assignee} onChange={handleEditChange}>
                                        <option value="Sophie Janssen">Sophie Janssen</option>
                                        <option value="Jan de Vries">Jan de Vries</option>
                                        <option value="Lisa Meijer">Lisa Meijer</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor='task-type'>Type</label>
                                    <select id='task-type' name="type" value={editedTask.type} onChange={handleEditChange}>
                                        <option value="Cleaning">Cleaning</option>
                                        <option value="Maintenance">Maintenance</option>
                                        <option value="Inspection">Inspection</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label htmlFor='task-booking-ref'>Booking Reference (optional)</label>
                                    <input id='task-booking-ref' type="text" name="bookingRef" value={editedTask.bookingRef || ''} onChange={handleEditChange} placeholder="Select booking." />
                                </div>
                                <div className="form-group">
                                    <label htmlFor='task-due-date'>Due Date</label>
                                    <input id='task-due-date' type="date" name="dueDate" value={editedTask.dueDate || ''} onChange={handleEditChange} onClick={(e) => e.target.showPicker?.()} />
                                </div>
                            </div>

                            <div className="form-group attachments-section">
                                <div className="attachments-header">
                                    <label htmlFor='task-attachments'>Attachments (optional)</label>
                                    <span className="attachments-count">0 Attachments</span>
                                </div>
                                <div className="attachments-box">
                                    <p className="no-attachments-text">No attachments yet.</p>
                                </div>
                            </div>

                            <div className="activity-section">
                                <div className="activity-header">
                                    <h4>Activity</h4>
                                    {editedTask.activities && editedTask.activities.length > 0 && (
                                        <span className="created-info">
                                            Created by {editedTask.activities[0].user} on {editedTask.activities[0].timestamp}
                                        </span>
                                    )}
                                </div>
                                <div className="activity-list">
                                    {(!editedTask.activities || editedTask.activities.length === 0) ? (
                                        <p className="no-attachments-text">No activity recorded yet.</p>
                                    ) : (
                                        [...editedTask.activities].reverse().map(activity => (
                                            <div className="activity-item" key={activity.id} style={{ alignItems: 'flex-start' }}>
                                                <div className="activity-avatar">U</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <p><strong>{activity.user}</strong> {activity.action}</p>
                                                    <span style={{ fontSize: '11px', color: '#adb5bd' }}>{activity.timestamp}</span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer details-footer">
                            <button className="btn-text" onClick={closeTaskDetails}>Cancel</button>
                            
                            {JSON.stringify(viewingTask) === JSON.stringify(editedTask) ? (
                                <button className="btn-create-green" onClick={handleDeleteSingleTask}>Delete</button>
                            ) : (
                                <button className="btn-create-green" onClick={handleSaveChanges}>Save Changes</button>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {confirmDialog.isOpen && (
                <div className="confirm-modal-overlay">
                    <div className="confirm-modal-content">
                        <div className="confirm-modal-icon">⚠️</div>
                        <h3>{confirmDialog.title}</h3>
                        <p>{confirmDialog.message}</p>
                        <div className="confirm-modal-actions">
                            <button className="btn-text" onClick={closeConfirmDialog}>{confirmDialog.cancelText}</button>
                            <button className="btn-create-green" onClick={confirmDialog.onConfirm}>{confirmDialog.confirmText}</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
};
export default HostPropertyCare;
