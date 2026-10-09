import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Auth } from 'aws-amplify';
import useEffectiveHostId from '../../../../hooks/useEffectiveHostId';
import {
    LuClipboardList, LuCircleAlert, LuRefreshCw, LuCircleCheck
} from 'react-icons/lu';
import '../styles/HostTasks.css';
import { fetchTasks, createTask, updateTask, deleteTask, uploadTaskAttachment } from '../../services/taskService';
import { fetchHostTaskPropertyOptions } from '../../services/hostTaskPropertyService';
import {
    fetchChecklistItems,
    createChecklistItem,
    updateChecklistItem,
    deleteChecklistItem,
} from '../services/taskChecklistService';
import { DEFAULT_FILTERS, getTodayString, isTaskOverdue, matchesTaskFilters } from '../utils/taskFilters';
import { sortTasks } from '../utils/taskSort';
import { getIntervalKey, getSortTimestamp } from '../utils/reportTimeBuckets';
import { buildTasksCsvReport } from '../utils/taskCsvExport';
import ConfirmDialog from '../components/ConfirmDialog';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskDetailsModal from '../components/TaskDetailsModal';
import SettingsView from '../components/SettingsView';
import MyTasksView from '../components/MyTasksView';
import ReportsView from '../components/ReportsView';
import TableView from '../components/TableView';

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

const HostTasks = () => {
    const { effectiveHostId, managedHostId, isPurelyPOM } = useEffectiveHostId();

    const [taskContext, setTaskContext] = useState('own');
    const asHostId = taskContext === 'managed' ? managedHostId : null;
    const loadRequestRef = useRef(0);
    const checklistRequestRef = useRef(0);

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
    const [checklistItems, setChecklistItems] = useState([]);
    const [checklistLoadError, setChecklistLoadError] = useState(null);

    const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });

    const [confirmDialog, setConfirmDialog] = useState({
        isOpen: false, title: '', message: '', confirmText: 'Confirm', cancelText: 'Cancel', onConfirm: null
    });

    const [currentUser, setCurrentUser] = useState({ name: '', email: '', group: '' });

    useEffect(() => {
        Auth.currentAuthenticatedUser()
            .then(u => {
                const attrs = u.attributes || {};
                setCurrentUser({
                    name: attrs.given_name || attrs.name || u.username || '',
                    email: attrs.email || '',
                    group: attrs['custom:group'] || '',
                });
            })
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!isModalOpen) return;
        const handler = (e) => { if (e.key === 'Escape') handleCancelModal(); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isModalOpen]);

    const [propertyOptions, setPropertyOptions] = useState([]);
    const [timeView, setTimeView] = useState('Weekly');

    const reportData = useMemo(() => {
        const filtered = tasks.filter((task) => matchesTaskFilters(task, filters, {
            includeAssignee: true,
            includeDate: true,
            excludeLegacy: true,
        }));

        const total = filtered.length;
        const completed = filtered.filter(t => t.status === 'Completed').length;
        const overdue = filtered.filter(t => t.status === 'Overdue').length;
        const inProgress = filtered.filter(t => t.status === 'In progress').length;
        const pending = filtered.filter(t => t.status === 'Pending').length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

        const completedWithDates = filtered.filter(t => t.status === 'Completed' && t.completed_date && t.created_at);
        const avgMs = completedWithDates.length > 0
            ? completedWithDates.reduce((sum, t) => sum + (Number(t.completed_date) - Number(t.created_at)), 0) / completedWithDates.length
            : 0;
        const avgCompletionTime = completedWithDates.length > 0
            ? `${Math.floor(avgMs / 3600000)}h ${Math.floor((avgMs % 3600000) / 60000)}m`
            : '—';

        const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const overdueThisWeek = filtered.filter(t =>
            t.status === 'Overdue' && t.due_date && Number(t.due_date) >= weekStart
        ).length;

        const distributionData = [
            { name: 'Pending', value: pending, color: '#6c757d' },
            { name: 'In Progress', value: inProgress, color: '#0062cc' },
            { name: 'Completed', value: completed, color: '#1e7e34' },
            { name: 'Overdue', value: overdue, color: '#dc3545' },
        ];

        const timeMap = {};
        filtered.forEach(task => {
            const key = getIntervalKey(task.created_at, timeView);
            const sortTs = getSortTimestamp(task.created_at, timeView);
            if (!key) return;
            if (!timeMap[key]) timeMap[key] = { date: key, _sort: sortTs, pending: 0, progress: 0, completed: 0, overdue: 0 };
            if (task.status === 'Pending') timeMap[key].pending++;
            else if (task.status === 'In progress') timeMap[key].progress++;
            else if (task.status === 'Completed') timeMap[key].completed++;
            else if (task.status === 'Overdue') timeMap[key].overdue++;
        });
        const timeData = Object.values(timeMap).sort((a, b) => a._sort - b._sort);

        const propertyMap = {};
        filtered.forEach(task => {
            const label = task.property || task.property_snapshot_label || 'Unknown';
            if (!propertyMap[label]) propertyMap[label] = { label, completed: 0, inProgress: 0, overdue: 0, total: 0 };
            propertyMap[label].total++;
            if (task.status === 'Completed') propertyMap[label].completed++;
            else if (task.status === 'In progress') propertyMap[label].inProgress++;
            else if (task.status === 'Overdue') propertyMap[label].overdue++;
        });
        const byProperty = Object.values(propertyMap);

        return { total, completed, overdue, inProgress, pending, completionRate, avgCompletionTime, overdueThisWeek, distributionData, timeData, byProperty };
    }, [tasks, filters, timeView]);

    useEffect(() => {
        const hostIdForOptions = asHostId ?? effectiveHostId;
        fetchHostTaskPropertyOptions(hostIdForOptions).then(setPropertyOptions);
    }, [asHostId, effectiveHostId]);
    
    const handleToggleComplete = async (task) => {
        const now = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        const todayStr = new Date().toISOString().split('T')[0];

        const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';

        const updatedTask = {
            ...task,
            status: newStatus,
            completedAt: newStatus === 'Completed' ? todayStr : null,
            completed_date: newStatus === 'Completed' ? Date.now() : null,
            activities: [
                ...(task.activities || []),
                { id: Date.now(), user: currentUser.name, action: `marked task ${newStatus}`, timestamp: now }
            ]
        };

        setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));

        try {
            await updateTask(task.id, { status: newStatus });
        } catch (error) {
            setTasks(tasks.map(t => t.id === task.id ? task : t));
            alert(error.message || "Error updating task status");
        }
    };

    useEffect(() => {
        void loadData();
    }, [asHostId]);

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
        const requestId = ++loadRequestRef.current;
        setIsLoading(true);
        try {
            const data = await fetchTasks({}, asHostId);
            if (requestId !== loadRequestRef.current) return;
            const todayStr = new Date().toISOString().split('T')[0];
            const processedTasks = data.map(task => {
                if (task.dueDate && task.dueDate < todayStr && task.status !== 'Completed' && task.status !== 'Cancelled') {
                    return { ...task, status: 'Overdue', priority: 'Urgent' };
                }
                return task;
            });
            setTasks(processedTasks);
        } catch {
            if (requestId !== loadRequestRef.current) return;
            setTasks([]);
        } finally {
            if (requestId === loadRequestRef.current) setIsLoading(false);
        }
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
            
            let attachmentUrls = [];
            if (newTask.attachments?.length > 0) {
                attachmentUrls = await Promise.all(newTask.attachments.map(uploadTaskAttachment));
            }

            let created = await createTask({ ...taskPayload, attachments: attachmentUrls });
            
            const todayStr = new Date().toISOString().split('T')[0];
            if (created.dueDate && created.dueDate < todayStr && created.status !== 'Completed' && created.status !== 'Cancelled') {
                created = { ...created, status: 'Overdue', priority: 'Urgent' };
            }

            setTasks([created, ...tasks]);
            setIsModalOpen(false);
            resetForm();
        } catch {
            alert("Error creating task");
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewTask(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setNewTask(prev => ({
            ...prev,
            attachments: [...(prev.attachments || []), ...files],
        }));
    };

    const handleEditFileChange = (e) => {
        const files = Array.from(e.target.files);
        setEditedTask(prev => ({
            ...prev,
            attachments: [...(prev.attachments || []), ...files],
        }));
    };

    const handleRemoveAttachment = (index) => {
        setEditedTask(prev => ({
            ...prev,
            attachments: (prev.attachments || []).filter((_, i) => i !== index),
        }));
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

    const loadChecklistItems = (taskId) => {
        const requestId = ++checklistRequestRef.current;
        setChecklistLoadError(null);
        fetchChecklistItems(taskId)
            .then(items => {
                if (requestId === checklistRequestRef.current) {
                    setChecklistItems(items);
                    setChecklistLoadError(null);
                }
            })
            .catch((error) => {
                if (requestId === checklistRequestRef.current) {
                    setChecklistItems([]);
                    setChecklistLoadError(error.message || "Failed to load checklist items");
                }
            });
    };

    const openTaskDetails = (task) => {
        setViewingTask(task);
        setEditedTask({ ...task });
        loadChecklistItems(task.id);
    };

    const handleRetryChecklistLoad = () => {
        loadChecklistItems(viewingTask.id);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditedTask(prev => ({ ...prev, [name]: value }));
    };

    const closeTaskDetails = () => {
        checklistRequestRef.current++;
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
                    setChecklistItems([]);
                    setChecklistLoadError(null);
                    closeConfirmDialog();
                }
            });
        } else {
            setViewingTask(null);
            setEditedTask(null);
            setChecklistItems([]);
            setChecklistLoadError(null);
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
            completed_date: editedTask.status === 'Completed' && viewingTask.status !== 'Completed'
                ? Date.now()
                : editedTask.completed_date ?? null,
            activities: [...(editedTask.activities || []), ...newLogs]
        };

        const newFiles = (editedTask.attachments || []).filter(a => a instanceof File);
        let existingUrls = (editedTask.attachments || []).filter(a => typeof a === 'string');

        if (newFiles.length > 0) {
            const uploaded = await Promise.all(newFiles.map(uploadTaskAttachment));
            existingUrls = [...existingUrls, ...uploaded];
        }

        const finalTask = { ...updatedTask, attachments: existingUrls };

        setTasks(tasks.map(t => t.id === finalTask.id ? finalTask : t));
        setViewingTask(null);
        setEditedTask(null);

        try {
            await updateTask(finalTask.id, finalTask);
        } catch (error) {
            setTasks(tasks.map(t => t.id === viewingTask.id ? viewingTask : t));
            alert(error.message || "Error saving changes");
        }
    };

    const handleAddChecklistItem = async (itemData) => {
        try {
            const created = await createChecklistItem(viewingTask.id, itemData);
            setChecklistItems(prev => [...prev, created]);
        } catch (error) {
            alert(error.message || "Error adding checklist item");
        }
    };

    const handleToggleChecklistItem = async (item) => {
        const nextChecked = !item.isChecked;
        setChecklistItems(prev => prev.map(i => i.id === item.id ? { ...i, isChecked: nextChecked } : i));
        try {
            await updateChecklistItem(item.id, { isChecked: nextChecked });
        } catch (error) {
            setChecklistItems(prev => prev.map(i => i.id === item.id ? { ...i, isChecked: item.isChecked } : i));
            alert(error.message || "Error updating checklist item");
        }
    };

    const handleRemoveChecklistItem = async (itemId) => {
        const previousItems = checklistItems;
        setChecklistItems(prev => prev.filter(i => i.id !== itemId));
        try {
            await deleteChecklistItem(itemId);
        } catch (error) {
            setChecklistItems(previousItems);
            alert(error.message || "Error removing checklist item");
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

    const getFilteredTasks = () => {
        return tasks.filter((task) => matchesTaskFilters(task, filters, {
            includeAssignee: true,
            includeDate: true,
            excludeLegacy: true,
            excludeCompleted: activeTab === 'Overview',
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

    const displayedTasks = sortTasks(filteredTasks, sortConfig);
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

    const propertyLabelMap = useMemo(() => {
        const map = {};
        propertyOptions.forEach(o => { map[o.id] = o.label; });
        return map;
    }, [propertyOptions]);

    const getPropertyLabel = (task) =>
        (task.property_id && propertyLabelMap[task.property_id]) || task.property || '';

    const assigneeOptions = useMemo(() => {
        const set = new Set(tasks.map(t => t.assignee).filter(Boolean));
        return [...set].sort((a, b) => a.localeCompare(b));
    }, [tasks]);

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
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    paginatedTasks = displayedTasks.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const handlePrevPage = () => setCurrentPage(p => Math.max(p - 1, 1));
    const handleNextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));

    const handleExportCSV = () => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-GB').replaceAll('/', '-');
        const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).replaceAll(':', '-');

        const csv = buildTasksCsvReport({ reportData, tasks, filters });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tasks-report_${dateStr}_${timeStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const renderContent = () => {
        if (isLoading) return <div className="loading">Loading...</div>;

        switch (activeTab) {
            case 'Overview':
            case 'All Tasks':
                return (
                    <TableView
                        filters={filters}
                        filterPropertyOptions={filterPropertyOptions}
                        sortConfig={sortConfig}
                        paginatedTasks={paginatedTasks}
                        totalResultsCount={displayedTasks.length}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        getPropertyLabel={getPropertyLabel}
                        onFilterChange={handleFilterChange}
                        onClearFilters={handleClearFilters}
                        onSort={handleSort}
                        onTaskClick={openTaskDetails}
                        onPrevPage={handlePrevPage}
                        onNextPage={handleNextPage}
                    />
                );
            case 'My Tasks':
                return (
                    <MyTasksView
                        tasks={tasks}
                        currentUser={currentUser}
                        filters={filters}
                        filterPropertyOptions={filterPropertyOptions}
                        getPropertyLabel={getPropertyLabel}
                        onFilterChange={handleFilterChange}
                        onTaskClick={openTaskDetails}
                        onToggleComplete={handleToggleComplete}
                    />
                );
            case 'Reports':
                return (
                    <ReportsView
                        reportData={reportData}
                        filters={filters}
                        filterPropertyOptions={filterPropertyOptions}
                        assigneeOptions={assigneeOptions}
                        timeView={timeView}
                        onFilterChange={handleFilterChange}
                        onTimeViewChange={setTimeView}
                        onExportCSV={handleExportCSV}
                    />
                );
            case 'Settings':
                return <SettingsView currentUser={currentUser} taskContext={taskContext} managedHostId={managedHostId} />;
            default:
                return null;
        }
    };
    return (
        <main className="task-dashboard-v2">
            <div className="top-header">
                <h2>Tasks</h2>
                <div className="top-header-actions">
                    {managedHostId && !isPurelyPOM && (
                        <div className="task-context-toggle">
                            <button
                                className={`task-context-btn ${taskContext === 'own' ? 'active' : ''}`}
                                onClick={() => setTaskContext('own')}
                            >
                                My tasks
                            </button>
                            <button
                                className={`task-context-btn ${taskContext === 'managed' ? 'active' : ''}`}
                                onClick={() => setTaskContext('managed')}
                            >
                                Co-host tasks
                            </button>
                        </div>
                    )}
                    <button className="btn-create-green btn-create-desktop" onClick={() => setIsModalOpen(true)}>
                        + Create Task
                    </button>
                </div>
            </div>

            <button className="btn-create-fab" onClick={() => setIsModalOpen(true)} aria-label="Create Task">
                +
            </button>

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
                        <div className="overview-stat-icon"><LuClipboardList /></div>
                        <div className="overview-stat-info">
                            <span className="overview-stat-label">Total Tasks</span>
                            <span className="overview-stat-value">{stats.total}</span>
                        </div>
                    </div>
                    <div className="overview-stat-card">
                        <div className="overview-stat-icon error-icon"><LuCircleAlert /></div>
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
                        <div className="overview-stat-icon info-icon"><LuRefreshCw /></div>
                        <div className="overview-stat-info">
                            <span className="overview-stat-label">In Progress</span>
                            <span className="overview-stat-value">{stats.inProgress}</span>
                        </div>
                    </div>
                    <div className="overview-stat-card">
                        <div className="overview-stat-icon success-icon"><LuCircleCheck /></div>
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
            
            <CreateTaskModal
                isOpen={isModalOpen}
                newTask={newTask}
                propertyOptions={createPropertyOptions}
                currentUser={currentUser}
                onInputChange={handleInputChange}
                onPropertyChange={handlePropertyChange}
                onFileChange={handleFileChange}
                onSubmit={handleCreateTask}
                onCancel={handleCancelModal}
            />

            <TaskDetailsModal
                viewingTask={viewingTask}
                editedTask={editedTask}
                editPropertyOptions={editPropertyOptions}
                currentUser={currentUser}
                onEditChange={handleEditChange}
                onPropertyChange={handleEditPropertyChange}
                onFileChange={handleEditFileChange}
                onRemoveAttachment={handleRemoveAttachment}
                onSave={handleSaveChanges}
                onDelete={handleDeleteSingleTask}
                onClose={closeTaskDetails}
                checklistItems={checklistItems}
                checklistLoadError={checklistLoadError}
                onAddChecklistItem={handleAddChecklistItem}
                onToggleChecklistItem={handleToggleChecklistItem}
                onRemoveChecklistItem={handleRemoveChecklistItem}
                onRetryChecklistLoad={handleRetryChecklistLoad}
            />

            <ConfirmDialog confirmDialog={confirmDialog} onCancel={closeConfirmDialog} />
        </main>
    );
};
export default HostTasks;
