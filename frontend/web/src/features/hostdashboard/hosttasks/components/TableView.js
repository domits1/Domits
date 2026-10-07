import React from 'react';
import PropTypes from 'prop-types';
import { LuSearch, LuChevronRight } from 'react-icons/lu';
import { getTodayString, isTaskOverdue } from '../utils/taskFilters';
import TaskFilterSelects from './TaskFilterSelects';

const getSortIcon = (sortConfig, columnKey, defaultIcon = '') => {
    if (sortConfig.key !== columnKey) return defaultIcon;
    return sortConfig.direction === 'asc' ? '▴' : '▾';
};

const Pagination = ({ currentPage, totalPages, onPrevPage, onNextPage }) => (
    <div className="pagination">
        <button onClick={onPrevPage} disabled={currentPage === 1}>Previous</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={onNextPage} disabled={currentPage === totalPages}>Next</button>
    </div>
);

const TableView = ({
    filters,
    filterPropertyOptions,
    sortConfig,
    paginatedTasks,
    totalResultsCount,
    currentPage,
    totalPages,
    getPropertyLabel,
    onFilterChange,
    onClearFilters,
    onSort,
    onTaskClick,
    onPrevPage,
    onNextPage,
}) => {
    const todayStr = getTodayString();

    return (
        <div className="overview-container">
            <div className="filters-bar">
                <div className="filters-dropdowns">
                    <TaskFilterSelects filters={filters} filterPropertyOptions={filterPropertyOptions} onFilterChange={onFilterChange} />
                    <select name="priority" value={filters.priority} onChange={onFilterChange}>
                        <option value="Any priority">Any priority</option>
                        <option value="Urgent">Urgent</option>
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                    </select>
                    <button className="btn-clear-filters" onClick={onClearFilters}>Clear filters</button>
                    <div className="search-box small-search">
                        <input type="text" name="search" value={filters.search} onChange={onFilterChange} placeholder="Search tasks" />
                        <LuSearch aria-hidden="true" />
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
                </div>
            </div>

            <div className="table-container">
                <table className="tasks-table">
                    <thead>
                        <tr>
                            <th onClick={() => onSort('title')} className="sortable-header">
                                Task {getSortIcon(sortConfig, 'title', '')}
                            </th>
                            <th onClick={() => onSort('property')} className="sortable-header">
                                Property {getSortIcon(sortConfig, 'property', '▾')}
                            </th>
                            <th onClick={() => onSort('type')} className="sortable-header">
                                Type {getSortIcon(sortConfig, 'type', '')}
                            </th>
                            <th onClick={() => onSort('assignee')} className="sortable-header">
                                Assignee {getSortIcon(sortConfig, 'assignee', '')}
                            </th>
                            <th onClick={() => onSort('dueDate')} className="sortable-header">
                                Due Date {getSortIcon(sortConfig, 'dueDate', '▾')}
                            </th>
                            <th onClick={() => onSort('priority')} className="sortable-header">
                                Priority {getSortIcon(sortConfig, 'priority', '▾')}
                            </th>
                            <th onClick={() => onSort('status')} className="sortable-header">
                                Status {getSortIcon(sortConfig, 'status', '▾')}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {totalResultsCount === 0 ? (
                            <tr>
                                <td colSpan="7" style={{textAlign: 'center', padding: '30px', color: '#495057'}}>
                                    No tasks match your filters (or all are completed/deleted).
                                </td>
                            </tr>
                        ) : (
                            paginatedTasks.map(task => {
                                const isOverdue = task.status === 'Overdue' || isTaskOverdue(task, todayStr);
                                const displayPriority = isOverdue ? 'Urgent' : (task.priority || 'Low');
                                const displayStatus = isOverdue ? 'Overdue' : task.status;

                                return (
                                <tr key={task.id} className={`clickable-row row-${displayStatus.toLowerCase().replace(' ', '-')}`} onClick={() => onTaskClick(task)}>
                                    <td>
                                        <div className="task-title-cell" title={task.title}>
                                            <LuChevronRight className="task-arrow" />
                                            <div className="truncate-text">
                                                <strong>{task.title}</strong>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{getPropertyLabel(task)}</td>
                                    <td>{task.type}</td>
                                    <td>{task.assignee}</td>
                                    <td>{task.dueDate === todayStr ? 'Today' : task.dueDate}</td>
                                    <td>
                                        <span className={`badge-priority ${displayPriority.toLowerCase()}`}>
                                            {displayPriority}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`badge-status ${displayStatus.toLowerCase().replace(' ', '-')}`}>
                                            ● {displayStatus}
                                        </span>
                                        {task.slaStatus === 'AT_RISK' && (
                                            <span className="badge-sla-at-risk">At risk</span>
                                        )}
                                    </td>
                                </tr>
                            )})
                        )}
                    </tbody>
                </table>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPrevPage={onPrevPage} onNextPage={onNextPage} />
            </div>
        </div>
    );
};

TableView.propTypes = {
    filters: PropTypes.shape({
        property: PropTypes.string,
        status: PropTypes.string,
        priority: PropTypes.string,
        search: PropTypes.string,
    }).isRequired,
    filterPropertyOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    sortConfig: PropTypes.shape({
        key: PropTypes.string,
        direction: PropTypes.string,
    }).isRequired,
    paginatedTasks: PropTypes.array.isRequired,
    totalResultsCount: PropTypes.number.isRequired,
    currentPage: PropTypes.number.isRequired,
    totalPages: PropTypes.number.isRequired,
    getPropertyLabel: PropTypes.func.isRequired,
    onFilterChange: PropTypes.func.isRequired,
    onClearFilters: PropTypes.func.isRequired,
    onSort: PropTypes.func.isRequired,
    onTaskClick: PropTypes.func.isRequired,
    onPrevPage: PropTypes.func.isRequired,
    onNextPage: PropTypes.func.isRequired,
};

export default TableView;
