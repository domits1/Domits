import React from 'react';
import PropTypes from 'prop-types';
import { LuClipboardList, LuSearch, LuPartyPopper } from 'react-icons/lu';
import TaskFilterSelects from './TaskFilterSelects';

const TaskRow = ({ task, isOverdueSection, todayStr, getPropertyLabel, onTaskClick, onToggleComplete }) => {
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
            className={`my-task-card ${isOverdueSection ? 'is-overdue-card' : ''}`}
            onClick={() => onTaskClick(task)}
            style={{ opacity: isCompleted ? 0.6 : 1 }}
        >
            <div className="my-task-left">
                <div className="my-task-icon"><LuClipboardList /></div>
                <div className="my-task-info">
                    <h4>{task.title}</h4>
                    <span>{getPropertyLabel(task)}</span>
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
                        onChange={() => onToggleComplete(task)}
                    />
                )}
            </div>
        </button>
    );
};

const MyTasksView = ({
    tasks,
    currentUser,
    filters,
    filterPropertyOptions,
    getPropertyLabel,
    onFilterChange,
    onTaskClick,
    onToggleComplete,
}) => {
    const todayStr = new Date().toISOString().split('T')[0];

    let myTasks = tasks.filter(t => t.assignee === currentUser.name && !t.isLegacy);

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

    const renderRow = (task, isOverdueSection = false) => (
        <TaskRow
            key={task.id}
            task={task}
            isOverdueSection={isOverdueSection}
            todayStr={todayStr}
            getPropertyLabel={getPropertyLabel}
            onTaskClick={onTaskClick}
            onToggleComplete={onToggleComplete}
        />
    );

    return (
        <div className="my-tasks-container">
            <div className="my-tasks-section">
                <div className="section-header-row">
                    <div className="section-title">
                        <h3>Today's Tasks</h3>
                        <span className="task-count">{todayTasks.length} Tasks</span>
                    </div>
                    <div className="my-tasks-filters">
                        <TaskFilterSelects filters={filters} filterPropertyOptions={filterPropertyOptions} onFilterChange={onFilterChange} />
                        <select name="priority" value={filters.priority} onChange={onFilterChange}>
                            <option value="Any priority">Any priority</option>
                            <option value="Urgent">Urgent</option>
                            <option value="Medium">Medium</option>
                            <option value="Low">Low</option>
                        </select>
                        <div className="search-box small-search">
                            <input type="text" name="search" value={filters.search} onChange={onFilterChange} placeholder="Search tasks" />
                            <LuSearch aria-hidden="true" />
                        </div>
                    </div>
                </div>
                <div className="my-task-list">
                    {todayTasks.length > 0 ? todayTasks.map(t => renderRow(t)) : <p className="empty-state">No tasks for today! <LuPartyPopper aria-hidden="true" /></p>}
                </div>
            </div>

            <div className="my-tasks-section">
                <div className="section-title">
                    <h3>Overdue</h3>
                    <span className="task-count">{overdueTasks.length} Task(s)</span>
                </div>
                <div className="my-task-list">
                    {overdueTasks.length > 0 ? overdueTasks.map(t => renderRow(t, true)) : null}
                </div>
            </div>

            <div className="my-tasks-section">
                <div className="section-title">
                    <h3>Upcoming</h3>
                    <span className="task-count">{upcomingTasks.length} Task(s)</span>
                </div>
                <div className="my-task-list">
                    {upcomingTasks.length > 0 ? upcomingTasks.map(t => renderRow(t)) : null}
                </div>
            </div>
        </div>
    );
};

MyTasksView.propTypes = {
    tasks: PropTypes.array.isRequired,
    currentUser: PropTypes.shape({
        name: PropTypes.string,
    }).isRequired,
    filters: PropTypes.shape({
        property: PropTypes.string,
        status: PropTypes.string,
        priority: PropTypes.string,
        search: PropTypes.string,
    }).isRequired,
    filterPropertyOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    getPropertyLabel: PropTypes.func.isRequired,
    onFilterChange: PropTypes.func.isRequired,
    onTaskClick: PropTypes.func.isRequired,
    onToggleComplete: PropTypes.func.isRequired,
};

export default MyTasksView;
