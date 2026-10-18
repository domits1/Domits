import React from 'react';
import PropTypes from 'prop-types';
import { LuClipboardList } from 'react-icons/lu';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import TaskFilterSelects from './TaskFilterSelects';

const ReportsView = ({
    reportData,
    filters,
    filterPropertyOptions,
    assigneeOptions,
    timeView,
    onFilterChange,
    onTimeViewChange,
    onExportCSV,
}) => (
    <div className="reports-container">
        <div className="reports-controls">
            <div className="reports-filters">
                <TaskFilterSelects filters={filters} filterPropertyOptions={filterPropertyOptions} onFilterChange={onFilterChange} />
                <select name="priority" value={filters.priority} onChange={onFilterChange}>
                    <option value="Any priority">Any priority</option>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                </select>
                <select name="assignee" value={filters.assignee} onChange={onFilterChange}>
                    <option value="Anyone">Anyone</option>
                    {assigneeOptions.map(a => (
                        <option key={a} value={a}>{a}</option>
                    ))}
                </select>
                <select name="date" value={filters.date} onChange={onFilterChange}>
                    <option value="Any date">Any date</option>
                    <option value="Today">Today</option>
                    <option value="This Week">This Week</option>
                </select>
            </div>
            <button className="btn-export-green" onClick={onExportCSV}>↥ Export CSV</button>
        </div>

        <div className="reports-main-grid">
            <div className="reports-left-col">
                <div className="reports-kpi-row">
                    <div className="kpi-card-v2">
                        <span className="kpi-title">Completion Rate</span>
                        <span className="kpi-main-val green-text">{reportData.completionRate}%</span>
                        <span className="kpi-sub">Completed {reportData.completed} out of {reportData.total} tasks</span>
                    </div>
                    <div className="kpi-card-v2">
                        <span className="kpi-title">Avg Completion Time</span>
                        <span className="kpi-main-val">{reportData.avgCompletionTime}</span>
                        <span className="kpi-sub">Average time taken to complete each task.</span>
                    </div>
                </div>
            </div>
            <div className="reports-right-col">
                <div className="kpi-card-v2">
                    <span className="kpi-title">Overdue Tasks</span>
                    <span className="kpi-main-val red-text">{reportData.overdue}</span>
                    <span className="kpi-sub">{reportData.overdueThisWeek} this week · {reportData.overdue} tasks exceeded their deadline.</span>
                </div>
            </div>
        </div>

        <div className="reports-main-grid">
            <div className="chart-box tasks-over-time">
                <div className="chart-header" style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
                    <h4 style={{margin:0}}>Tasks Over Time</h4>
                    <div className="chart-toggle" style={{display:'flex', gap:'8px'}}>
                        {['Weekly', 'Daily'].map(v => (
                            <button
                                key={v}
                                onClick={() => onTimeViewChange(v)}
                                style={{
                                    padding: '4px 12px',
                                    borderRadius: '4px',
                                    border: '1px solid #ced4da',
                                    background: timeView === v ? '#28a745' : '#fff',
                                    color: timeView === v ? '#fff' : '#495057',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                }}
                            >{v}</button>
                        ))}
                    </div>
                </div>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <BarChart data={reportData.timeData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} />
                            <Tooltip cursor={{fill: '#f5f5f5'}} />
                            <Legend wrapperStyle={{fontSize: '12px', paddingTop: '12px'}} />
                            <Bar dataKey="pending" name="Pending" stackId="a" fill="#6c757d" barSize={30} />
                            <Bar dataKey="progress" name="In Progress" stackId="a" fill="#0062cc" />
                            <Bar dataKey="completed" name="Completed" stackId="a" fill="#1e7e34" />
                            <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#dc3545" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="chart-box task-distribution">
                <h4>Task Distribution</h4>
                <div className="donut-wrapper">
                    <div className="donut-chart-area">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={reportData.distributionData.filter(d => d.value > 0)}
                                    innerRadius="45%"
                                    outerRadius="65%"
                                    paddingAngle={3}
                                    dataKey="value"
                                    cx="50%"
                                    cy="50%"
                                >
                                    {reportData.distributionData.filter(d => d.value > 0).map((entry) => (
                                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [`${value} tasks`, name]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="donut-legend">
                        {reportData.distributionData.map(d => (
                            <div key={d.name} className="summary-item" style={{ border: 'none', padding: '5px 0' }}>
                                <span className="dot" style={{ backgroundColor: d.color, marginRight: '8px' }}></span>
                                <span style={{fontSize: '13px'}}>{d.name}</span>
                                <span className="sum-val">{d.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <div className="reports-bottom-row">
            <div className="chart-box tasks-by-property">
                <h4>Tasks by Property</h4>
                <div className="property-list-v2">
                    {reportData.byProperty.length === 0 ? (
                        <p className="empty-state">No tasks match current filters.</p>
                    ) : reportData.byProperty.map(prop => {
                        const completedPct = prop.total > 0 ? (prop.completed / prop.total) * 100 : 0;
                        const progressPct = prop.total > 0 ? (prop.inProgress / prop.total) * 100 : 0;
                        const overduePct = prop.total > 0 ? (prop.overdue / prop.total) * 100 : 0;
                        return (
                            <div key={prop.label} className="prop-row-v2">
                                <div className="prop-name-cell">{prop.label}</div>
                                <div className="prop-status-label">
                                    {prop.completed === prop.total && prop.total > 0 ? 'Completed' : 'In progress'}
                                </div>
                                <div className="prop-progress-wrapper">
                                    <div className="multi-progress">
                                        <div className="progress-segment p-done" style={{width: `${completedPct}%`}}></div>
                                        <div className="progress-segment p-progress" style={{width: `${progressPct}%`}}></div>
                                        <div className="progress-segment p-overdue" style={{width: `${overduePct}%`}}></div>
                                    </div>
                                </div>
                                <div className="prop-total-val">{prop.total}</div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="chart-box task-summary-panel">
                <h4>Task Summary</h4>
                <div className="summary-list">
                    <div className="summary-item"><span className="sum-icon"><LuClipboardList /></span> Total Tasks <span className="sum-val">{reportData.total}</span></div>
                    <div className="summary-item"><span className="dot dot-pending" style={{marginRight:'8px'}}></span> Pending <span className="sum-val">{reportData.pending}</span></div>
                    <div className="summary-item"><span className="dot dot-inprogress" style={{marginRight:'8px'}}></span> In Progress <span className="sum-val">{reportData.inProgress}</span></div>
                    <div className="summary-item"><span className="dot dot-completed" style={{marginRight:'8px'}}></span> Completed <span className="sum-val">{reportData.completed}</span></div>
                    <div className="summary-item"><span className="dot dot-overdue" style={{marginRight:'8px'}}></span> Overdue <span className="sum-val">{reportData.overdue}</span></div>
                </div>
            </div>
        </div>
    </div>
);

ReportsView.propTypes = {
    reportData: PropTypes.shape({
        completionRate: PropTypes.number,
        completed: PropTypes.number,
        total: PropTypes.number,
        avgCompletionTime: PropTypes.string,
        overdue: PropTypes.number,
        overdueThisWeek: PropTypes.number,
        pending: PropTypes.number,
        inProgress: PropTypes.number,
        timeData: PropTypes.array,
        distributionData: PropTypes.array,
        byProperty: PropTypes.array,
    }).isRequired,
    filters: PropTypes.shape({
        property: PropTypes.string,
        status: PropTypes.string,
        priority: PropTypes.string,
        assignee: PropTypes.string,
        date: PropTypes.string,
    }).isRequired,
    filterPropertyOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    assigneeOptions: PropTypes.arrayOf(PropTypes.string).isRequired,
    timeView: PropTypes.string.isRequired,
    onFilterChange: PropTypes.func.isRequired,
    onTimeViewChange: PropTypes.func.isRequired,
    onExportCSV: PropTypes.func.isRequired,
};

export default ReportsView;
