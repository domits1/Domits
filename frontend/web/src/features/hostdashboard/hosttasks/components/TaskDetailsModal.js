import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { LuX } from 'react-icons/lu';
import { getTodayString } from '../utils/taskFilters';
import { TASK_TYPE_OPTIONS } from '../utils/taskTypeOptions';
import AttachmentThumb from './AttachmentThumb';
import ChecklistSection from './ChecklistSection';

const STATUS_OPTIONS = [
    { value: 'Pending',     label: '● Pending',     cls: 'status-pending' },
    { value: 'In progress', label: '● In progress', cls: 'status-in-progress' },
    { value: 'Completed',   label: '● Completed',   cls: 'status-completed' },
    { value: 'Overdue',     label: '● Overdue',     cls: 'status-overdue' },
    { value: 'Cancelled',   label: '● Cancelled',   cls: 'status-cancelled' },
];

const PRIORITY_OPTIONS = [
    { value: 'Low',    label: 'Low',    cls: 'priority-low' },
    { value: 'Medium', label: 'Medium', cls: 'priority-medium' },
    { value: 'High',   label: 'High',   cls: 'priority-high' },
    { value: 'Urgent', label: 'Urgent', cls: 'priority-urgent' },
];

const TaskDetailsModal = ({
    viewingTask,
    editedTask,
    editPropertyOptions,
    currentUser,
    checklistItems,
    onEditChange,
    onPropertyChange,
    onFileChange,
    onRemoveAttachment,
    onAddChecklistItem,
    onToggleChecklistItem,
    onRemoveChecklistItem,
    onSave,
    onDelete,
    onClose,
}) => {
    const [openDropdown, setOpenDropdown] = useState(null);

    useEffect(() => {
        if (!openDropdown) return;
        const handler = () => setOpenDropdown(null);
        document.addEventListener('click', handler);
        return () => document.removeEventListener('click', handler);
    }, [openDropdown]);

    if (!viewingTask || !editedTask) return null;

    const isUnchanged = JSON.stringify(viewingTask) === JSON.stringify(editedTask);

    return (
        <>
            <button className="modal-backdrop" onClick={onClose} aria-label="Close modal" />
            <div className="modal-overlay">
                <div className="modal-content-large task-details-modal">
                    <div className="modal-header details-header">
                        <input
                            className="details-title-input"
                            name="title"
                            value={editedTask.title}
                            onChange={onEditChange}
                            placeholder="Task title"
                        />
                        <button className="close-btn" onClick={onClose}><LuX /></button>
                    </div>

                    <div className="details-badges-row">
                        <div className="custom-badge-select-wrapper" role="none" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                            <button
                                type="button"
                                className={`badge-select status-${editedTask.status.toLowerCase().replace(' ', '-')}`}
                                onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                            >
                                ● {editedTask.status}
                            </button>
                            {openDropdown === 'status' && (
                                <div className="custom-badge-options">
                                    {STATUS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            className={`custom-badge-option ${opt.cls}`}
                                            onClick={() => {
                                                onEditChange({ target: { name: 'status', value: opt.value } });
                                                setOpenDropdown(null);
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="custom-badge-select-wrapper" role="none" onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                            <button
                                type="button"
                                className={`badge-select priority-${editedTask.priority.toLowerCase()}`}
                                onClick={() => setOpenDropdown(openDropdown === 'priority' ? null : 'priority')}
                            >
                                {editedTask.priority}
                            </button>
                            {openDropdown === 'priority' && (
                                <div className="custom-badge-options">
                                    {PRIORITY_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            className={`custom-badge-option ${opt.cls}`}
                                            onClick={() => {
                                                onEditChange({ target: { name: 'priority', value: opt.value } });
                                                setOpenDropdown(null);
                                            }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <select name="property" value={editedTask.property_id || ''} onChange={onPropertyChange} className="badge-select property-badge">
                            {editPropertyOptions.map((o) => (
                                <option key={o.id} value={o.id}>{o.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="details-body">
                        <div className="form-group">
                            <label htmlFor='task-description'>Description</label>
                            <textarea id='task-description' name="description" value={editedTask.description || ''} onChange={onEditChange} rows="3" placeholder="Enter description..." />
                        </div>

                        <div className="form-row-grid">
                            <div className="form-group">
                                <label htmlFor='task-assignee'>Assignee</label>
                                <select id='task-assignee' name="assignee" value={editedTask.assignee} onChange={onEditChange}>
                                    {currentUser.name && <option value={currentUser.name}>{currentUser.name}</option>}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor='task-type'>Type</label>
                                <select id='task-type' name="type" value={editedTask.type} onChange={onEditChange}>
                                    {TASK_TYPE_OPTIONS.map(option => (
                                        <option key={option} value={option}>{option}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor='task-booking-ref'>Booking Reference</label>
                                <input id='task-booking-ref' type="text" name="bookingRef" value={editedTask.bookingRef || ''} placeholder="Coming soon" disabled />
                            </div>
                            <div className="form-group">
                                <label htmlFor='task-due-date'>Due Date</label>
                                <input id='task-due-date' type="date" name="dueDate" value={editedTask.dueDate || ''} min={getTodayString()} onChange={onEditChange} onClick={(e) => e.target.showPicker?.()} />
                            </div>
                        </div>

                        <div className="form-group attachments-section">
                            <div className="attachments-header">
                                <label htmlFor='task-attachments-edit'>Attachments (optional)</label>
                                <span className="attachments-count">{(editedTask.attachments?.length || 0)} Attachments</span>
                            </div>
                            <div className="attachments-box">
                                {(!editedTask.attachments || editedTask.attachments.length === 0) ? (
                                    <p className="no-attachments-text">No attachments yet.</p>
                                ) : (
                                    <div className="attachments-grid">
                                        {editedTask.attachments.map((f, index) => (
                                            <AttachmentThumb
                                                key={f instanceof File ? f.name : f}
                                                attachment={f}
                                                onRemove={() => onRemoveAttachment(index)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="custom-file-upload" style={{ marginTop: '8px' }}>
                                <input type="file" id="task-attachments-edit" name="attachments" multiple accept="image/*,application/pdf" onChange={onFileChange} />
                                <label htmlFor="task-attachments-edit">
                                    <span className="upload-text">Upload file...</span>
                                </label>
                            </div>
                        </div>

                        <ChecklistSection
                            items={checklistItems}
                            onAddItem={onAddChecklistItem}
                            onToggleChecked={onToggleChecklistItem}
                            onRemoveItem={onRemoveChecklistItem}
                        />

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
                        <button className="btn-text" onClick={onClose}>Cancel</button>

                        {isUnchanged ? (
                            <button className="btn-danger" onClick={onDelete}>Delete</button>
                        ) : (
                            <button className="btn-create-green" onClick={onSave}>Save Changes</button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

TaskDetailsModal.propTypes = {
    viewingTask: PropTypes.object,
    editedTask: PropTypes.object,
    editPropertyOptions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string,
    })).isRequired,
    currentUser: PropTypes.shape({
        name: PropTypes.string,
        email: PropTypes.string,
    }).isRequired,
    checklistItems: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        isRequired: PropTypes.bool,
        isChecked: PropTypes.bool,
    })).isRequired,
    onEditChange: PropTypes.func.isRequired,
    onPropertyChange: PropTypes.func.isRequired,
    onFileChange: PropTypes.func.isRequired,
    onRemoveAttachment: PropTypes.func.isRequired,
    onAddChecklistItem: PropTypes.func.isRequired,
    onToggleChecklistItem: PropTypes.func.isRequired,
    onRemoveChecklistItem: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default TaskDetailsModal;
