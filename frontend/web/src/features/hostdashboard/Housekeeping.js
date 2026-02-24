import React, { useState, useEffect } from 'react';
import './Housekeeping.css';
import { createTask, fetchTasks, updateTaskStatus, deleteTask } from './services/faketaskService';

const HostPropertyCare = () => {
    // --- STATE ---
    const [activeTab, setActiveTab] = useState('Overview'); 
    const [tasks, setTasks] = useState([]);
    const [stats, setStats] = useState({ total: 0, overdue: 0, overdueIncrease: 0, inProgress: 0, completedToday: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const [newTask, setNewTask] = useState({
        title: '', description: '', property: '', bookingRef: '', 
        type: 'Cleaning', assignee: '', attachments: null
    });

    const [filters, setFilters] = useState({
        property: 'All properties',
        status: 'All statuses',
        assignee: 'Anyone',
        date: 'Any date',
        priority: 'Any priority',
        search: ''
    });

    // --- EFFECT: LOAD DATA ---
    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const newStats = {
            total: tasks.length,
            overdue: tasks.filter(t => t.status === 'Overdue' || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Completed')).length,
            overdueIncrease: tasks.filter(t => t.dueDate === yesterdayStr && t.status !== 'Completed').length,
            inProgress: tasks.filter(t => t.status === 'In progress').length,
            completedToday: tasks.filter(t => t.status === 'Completed' && t.completedAt === todayStr).length
        };
        setStats(newStats);
    }, [tasks]);

    const loadData = async () => {
        setIsLoading(true);
        const data = await fetchTasks();
        setTasks(data);
        setIsLoading(false);
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            const taskPayload = { ...newTask, status: 'Pending' }; 
            const created = await createTask(taskPayload);
            setTasks([created, ...tasks]);
            setIsModalOpen(false);
            resetForm();
        } catch (error) {
            alert("Error creating task");
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewTask(prev => ({ ...prev, [name]: value }));
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        setNewTask(prev => ({ ...prev, attachments: e.target.files[0] }));
    };

    const handleCancelModal = () => {
        const hasUnsavedChanges = newTask.title || newTask.description || newTask.property || newTask.bookingRef || newTask.assignee || newTask.attachments;
        if (hasUnsavedChanges) {
            const confirmLeave = window.confirm("You have unsaved changes. Are you sure you want to cancel?");
            if (confirmLeave) {
                setIsModalOpen(false);
                resetForm();
            }
        } else {
            setIsModalOpen(false);
            resetForm();
        }
    };

    const resetForm = () => {
        setNewTask({ title: '', description: '', property: '', bookingRef: '', type: 'Cleaning', assignee: '', attachments: null });
    };
    // --- FILTER LOGIC ---
    const handleClearFilters = () => {
        setFilters({
            property: 'All properties',
            status: 'All statuses',
            assignee: 'Anyone',
            date: 'Any date',
            priority: 'Any priority',
            search: ''
        });
    };

    const getFilteredTasks = () => {
        return tasks.filter(task => {
            const matchProperty = filters.property === 'All properties' || task.property === filters.property;
            const matchStatus = filters.status === 'All statuses' || task.status === filters.status;
            const matchAssignee = filters.assignee === 'Anyone' || task.assignee === filters.assignee;
            const matchPriority = filters.priority === 'Any priority' || task.priority === filters.priority;
            
            const searchLower = filters.search.toLowerCase();
            const matchSearch = filters.search === '' || 
                (task.title && task.title.toLowerCase().includes(searchLower)) ||
                (task.property && task.property.toLowerCase().includes(searchLower)) ||
                (task.assignee && task.assignee.toLowerCase().includes(searchLower));

            let matchDate = true;
            if (filters.date === 'Today') {
                const todayStr = new Date().toISOString().split('T')[0];
                matchDate = task.dueDate === todayStr;
            } else if (filters.date === 'This Week') {
                const taskDate = new Date(task.dueDate);
                const today = new Date();
                today.setHours(0,0,0,0);
                const nextWeek = new Date(today);
                nextWeek.setDate(today.getDate() + 7);
                matchDate = task.dueDate && taskDate >= today && taskDate <= nextWeek;
            }

            return matchProperty && matchStatus && matchAssignee && matchPriority && matchSearch && matchDate;
        });
    };

    const filteredTasks = getFilteredTasks();

    // --- RENDER HELPERS ---
    const renderContent = () => {
        if (isLoading) return <div className="loading">Loading...</div>;

        switch (activeTab) {
            case 'Overview':
            case 'All Tasks': 
                return renderTableView();
            case 'My Tasks':
                return <div className="placeholder-view">My Tasks View (Coming soon)</div>;
            case 'Reports':
                return <div className="placeholder-view">Reports View</div>;
            case 'Settings':
                return <div className="placeholder-view">Settings View</div>;
            default:
                return null;
        }
    };

    const renderTableView = () => (
        <div className="overview-container">
            <div className="filters-bar">
                <div className="filters-dropdowns">
                    <select name="property" value={filters.property} onChange={handleFilterChange}>
                        <option value="All properties">All properties</option>
                        <option value="City Loft Breda">City Loft Breda</option>
                        <option value="Beach House">Beach House</option>
                    </select>
                    <select name="status" value={filters.status} onChange={handleFilterChange}>
                        <option value="All statuses">All statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="In progress">In progress</option>
                    </select>
                    <select name="assignee" value={filters.assignee} onChange={handleFilterChange}>
                        <option value="Anyone">Anyone</option>
                        <option value="Sophie Janssen">Sophie Janssen</option>
                        <option value="Jan de Vries">Jan de Vries</option>
                    </select>
                    <select name="date" value={filters.date} onChange={handleFilterChange}>
                        <option value="Any date">Any date</option>
                        <option value="Today">Today</option>
                        <option value="This Week">This Week</option>
                    </select>
                    <select name="priority" value={filters.priority} onChange={handleFilterChange}>
                        <option value="Any priority">Any priority</option>
                        <option value="Urgent">Urgent</option>
                        <option value="High">High</option>
                    </select>
                    
                    <div className="search-box">
                        <input type="text" name="search" value={filters.search} onChange={handleFilterChange} placeholder="Search tasks" />
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
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
                    <button className="btn-clear-filters" onClick={handleClearFilters}>
                        Clear filters
                    </button>
                </div>
            </div>

            <div className="table-container">
                <table className="tasks-table">
                    <thead>
                        <tr>
                            <th>Task</th>
                            <th>Property ▾</th>
                            <th>Type</th>
                            <th>Assignee</th>
                            <th>Due Date ▾</th>
                            <th>Priority ▾</th>
                            <th>Status ▾</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTasks.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{textAlign: 'center', padding: '30px', color: '#6c757d'}}>
                                    No tasks match your filters.
                                </td>
                            </tr>
                        ) : (
                            filteredTasks.map(task => (
                                <tr key={task.id} className={`row-${task.status.toLowerCase().replace(' ', '-')}`}>
                                <td>
                                    <div className="task-title-cell">
                                        <span className="task-arrow">▶</span> 
                                        <div>
                                            <strong>{task.title}</strong>
                                        </div>
                                    </div>
                                </td>
                                <td>{task.property}</td>
                                <td>{task.type}</td>
                                <td>{task.assignee}</td>
                                <td>{task.dueDate || 'Today'}</td>
                                <td>
                                    <span className={`badge-priority ${task.priority ? task.priority.toLowerCase() : 'medium'}`}>
                                        {task.priority || 'Medium'}
                                    </span>
                                </td>
                                <td>
                                    <span className={`badge-status ${task.status.toLowerCase().replace(' ', '-')}`}>
                                        ● {task.status}
                                    </span>
                                </td>
                            </tr>
                        )))}
                    </tbody>
                </table>
            </div>
            
            <div className="table-footer-actions">
                <button className="btn-text">Cancel</button>
                <button className="btn-create-green" style={{backgroundColor: '#28a745'}}>Delete</button>
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
                                <label>Title</label>
                                <input type="text" name="title" value={newTask.title} onChange={handleInputChange} placeholder="Repair broken patio light" required />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea name="description" value={newTask.description} onChange={handleInputChange} placeholder="The patio light is broken and needs to be fixed as soon as possible." rows="3" required />
                            </div>
                            <div className="form-group">
                                <label>Property</label>
                                <select name="property" value={newTask.property} onChange={handleInputChange} required>
                                    <option value="" disabled hidden>Select Property</option>
                                    <option value="City Loft Breda">City Loft Breda</option>
                                    <option value="Beach House">Beach House</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Booking Reference (optional)</label>
                                <input type="text" name="bookingRef" value={newTask.bookingRef} onChange={handleInputChange} placeholder="Select booking." />
                            </div>
                            <div className="form-group">
                                <label>Type</label>
                                <div className="radio-group">
                                    <label><input type="radio" name="type" value="Cleaning" checked={newTask.type === 'Cleaning'} onChange={handleInputChange} /> Cleaning</label>
                                    <label><input type="radio" name="type" value="Maintenance" checked={newTask.type === 'Maintenance'} onChange={handleInputChange} /> Maintenance</label>
                                    <label><input type="radio" name="type" value="Inspection" checked={newTask.type === 'Inspection'} onChange={handleInputChange} /> Inspection</label>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Assignee</label>
                                <select name="assignee" value={newTask.assignee} onChange={handleInputChange} required>
                                    <option value="" disabled hidden>Select Assignee</option>
                                    <option value="Sophie Janssen">Sophie Janssen (sophie@domits.com)</option>
                                    <option value="Jan de Vries">Jan de Vries (jan@domits.com)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Attachments (optional)</label>
                                <div className="custom-file-upload">
                                    <input type="file" id="file-upload" onChange={handleFileChange} />
                                    <label htmlFor="file-upload">
                                        <svg className="upload-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5l13.732-13.732z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        <span className="upload-text">
                                            {newTask.attachments ? newTask.attachments.name : 'Upload file...'}
                                        </span>
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
        </main>
    );
};

export default HostPropertyCare;