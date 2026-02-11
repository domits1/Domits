import React, { useState } from 'react';
import Modal from 'react-modal';
import './TemplateManager.scss';

const TemplateManager = ({ isOpen, onClose, templates, onSave }) => {
    const [localTemplates, setLocalTemplates] = useState(templates);
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ title: '', content: '', triggers: [] });

    const handleEdit = (template) => {
        setEditingId(template.id);
        setEditForm({
            title: template.title,
            content: template.content,
            triggers: template.triggers || []
        });
    };

    const handleCreate = () => {
        setEditingId('new');
        setEditForm({ title: '', content: '', triggers: [] });
    };

    const handleDelete = (id) => {
        setLocalTemplates(prev => prev.filter(t => t.id !== id));
        if (editingId === id) {
            setEditingId(null);
        }
    };

    const handleSaveForm = () => {
        if (!editForm.title || !editForm.content) return;

        if (editingId === 'new') {
            const newTemplate = {
                ...editForm,
                id: Date.now().toString()
            };
            setLocalTemplates([...localTemplates, newTemplate]);
        } else {
            setLocalTemplates(prev => prev.map(t => t.id === editingId ? { ...t, ...editForm } : t));
        }
        setEditingId(null);
    };

    const handleAddTrigger = () => {
        setEditForm(prev => ({
            ...prev,
            triggers: [...prev.triggers, { event: 'check-in', offsetTime: 0, offsetUnit: 'hours', type: 'before' }]
        }));
    };

    const handleRemoveTrigger = (index) => {
        setEditForm(prev => ({
            ...prev,
            triggers: prev.triggers.filter((_, i) => i !== index)
        }));
    };

    const handleTriggerChange = (index, field, value) => {
        setEditForm(prev => ({
            ...prev,
            triggers: prev.triggers.map((t, i) => i === index ? { ...t, [field]: value } : t)
        }));
    };

    const handleSaveAll = () => {
        onSave(localTemplates);
        onClose();
    };

    return (
        <Modal
            isOpen={isOpen}
            onRequestClose={onClose}
            contentLabel="Manage Templates"
            className="template-manager-modal"
            overlayClassName="template-manager-overlay"
            ariaHideApp={false}
        >
            <div className="template-manager-header">
                <h2>Manage Message Templates</h2>
                <button onClick={onClose} className="close-btn">&times;</button>
            </div>

            <div className="template-manager-body">
                <div className="template-list">
                    <button className="create-btn" onClick={handleCreate}>+ New Template</button>
                    {localTemplates.map(t => (
                        <div key={t.id} className={`template-item ${editingId === t.id ? 'active' : ''}`}>
                            <span onClick={() => handleEdit(t)}>{t.title}</span>
                            <button className="delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>🗑️</button>
                        </div>
                    ))}
                </div>

                <div className="template-editor">
                    {editingId ? (
                        <>
                            <div className="form-group">
                                <label>Template Name</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Message Content</label>
                                <textarea
                                    value={editForm.content}
                                    onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                                    rows={5}
                                />
                            </div>
                            
                            <div className="triggers-section">
                                <div className="triggers-header">
                                    <label>Automated Triggers</label>
                                    <button onClick={handleAddTrigger} className="add-trigger-btn">+ Add Trigger</button>
                                </div>
                                {editForm.triggers.map((trigger, idx) => (
                                    <div key={idx} className="trigger-row">
                                        <select
                                            value={trigger.type}
                                            onChange={e => handleTriggerChange(idx, 'type', e.target.value)}
                                        >
                                            <option value="before">Before</option>
                                            <option value="after">After</option>
                                            <option value="on">On</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={trigger.offsetTime}
                                            onChange={e => handleTriggerChange(idx, 'offsetTime', e.target.value)}
                                            style={{ width: '60px' }}
                                        />
                                        <select
                                            value={trigger.offsetUnit}
                                            onChange={e => handleTriggerChange(idx, 'offsetUnit', e.target.value)}
                                        >
                                            <option value="minutes">Minutes</option>
                                            <option value="hours">Hours</option>
                                            <option value="days">Days</option>
                                        </select>
                                        <span>of</span>
                                        <select
                                            value={trigger.event}
                                            onChange={e => handleTriggerChange(idx, 'event', e.target.value)}
                                        >
                                            <option value="check-in">Check-in</option>
                                            <option value="check-out">Check-out</option>
                                            <option value="booking-confirmation">Booking Confirmation</option>
                                        </select>
                                        <button onClick={() => handleRemoveTrigger(idx)} className="remove-trigger-btn">&times;</button>
                                    </div>
                                ))}
                            </div>

                            <div className="editor-actions">
                                <button className="save-btn" onClick={handleSaveForm}>Update Template</button>
                                <button className="cancel-btn" onClick={() => setEditingId(null)}>Cancel</button>
                            </div>
                        </>
                    ) : (
                        <div className="no-selection">Select a template to edit or create a new one.</div>
                    )}
                </div>
            </div>

            <div className="template-manager-footer">
                <button className="main-save-btn" onClick={handleSaveAll}>Save All Changes</button>
            </div>
        </Modal>
    );
};

export default TemplateManager;

