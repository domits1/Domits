import React from 'react';
import PropTypes from 'prop-types';
import { LuX } from 'react-icons/lu';
import { getTodayString } from '../utils/taskFilters';
import { TASK_TYPE_OPTIONS } from '../utils/taskTypeOptions';

const CreateTaskModal = ({
    isOpen,
    newTask,
    propertyOptions,
    assigneeOptions,
    onInputChange,
    onPropertyChange,
    onAssigneeChange,
    onFileChange,
    onSubmit,
    onCancel,
}) => {
    if (!isOpen) return null;

    return (
        <>
            <button className="modal-backdrop" onClick={onCancel} aria-label="Close modal" />
            <div className="modal-overlay">
                <div className="modal-content-large">
                    <div className="modal-header">
                        <h3>Create Task</h3>
                        <button className="close-btn" onClick={onCancel}><LuX /></button>
                    </div>
                    <form onSubmit={onSubmit}>
                        <div className="form-group">
                            <label htmlFor='task-title'>Title</label>
                            <input type="text" id='task-title' name="title" value={newTask.title} onChange={onInputChange} placeholder="Repair broken patio light" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor='task-description'>Description</label>
                            <textarea id='task-description' name="description" value={newTask.description} onChange={onInputChange} placeholder="Description here..." rows="3" required />
                        </div>
                        <div className="form-group">
                            <label htmlFor='task-property'>Property</label>
                            <select id='task-property' name="property" value={newTask.property_id} onChange={onPropertyChange} required>
                                <option value="" disabled hidden>Select Property</option>
                                {propertyOptions.map(o => (
                                    <option key={o.id} value={o.id}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor='task-booking-ref'>Booking Reference</label>
                            <input type="text" id='task-booking-ref' name="bookingRef" value={newTask.bookingRef} placeholder="Coming soon" disabled />
                        </div>
                        <div className="form-group">
                            <label htmlFor='task-type'>Type</label>
                            <select id='task-type' name="type" value={newTask.type} onChange={onInputChange} required>
                                {TASK_TYPE_OPTIONS.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor='task-assignee'>Assignee</label>
                            <select id='task-assignee' name="assignee" value={newTask.assigneeSelection} onChange={onAssigneeChange} required>
                                <option value="" disabled hidden>Select Assignee</option>
                                {assigneeOptions.map(o => (
                                    <option key={o.id} value={o.id}>{o.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor='task-due-date'>Due Date</label>
                            <input type="date" id='task-due-date' name="dueDate" value={newTask.dueDate} min={getTodayString()} onChange={onInputChange} onClick={(e) => e.target.showPicker?.()} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor='task-priority'>Priority</label>
                            <select id='task-priority' name="priority" value={newTask.priority} onChange={onInputChange} required>
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Urgent">Urgent</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor='task-attachments'>Attachments (optional)</label>
                            <div className="custom-file-upload">
                                <input type="file" id="file-upload" name="attachments" multiple accept="image/*,application/pdf" onChange={onFileChange} />
                                <label htmlFor="file-upload">
                                    <span className="upload-text">{newTask.attachments?.length > 0 ? `${newTask.attachments.length} file(s) selected` : 'Upload file...'}</span>
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'auto' }}>
                            <button type="button" className="btn-text" onClick={onCancel}>Cancel</button>
                            <button type="submit" className="btn-create-green">Create Task</button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
};

CreateTaskModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    newTask: PropTypes.shape({
        title: PropTypes.string,
        description: PropTypes.string,
        property_id: PropTypes.string,
        bookingRef: PropTypes.string,
        type: PropTypes.string,
        assignee: PropTypes.string,
        assigneeSelection: PropTypes.string,
        assignee_team_member_id: PropTypes.string,
        dueDate: PropTypes.string,
        priority: PropTypes.string,
        attachments: PropTypes.array,
    }).isRequired,
    propertyOptions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string,
    })).isRequired,
    assigneeOptions: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        label: PropTypes.string,
    })).isRequired,
    onInputChange: PropTypes.func.isRequired,
    onPropertyChange: PropTypes.func.isRequired,
    onAssigneeChange: PropTypes.func.isRequired,
    onFileChange: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
};

export default CreateTaskModal;
