import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { LuX } from 'react-icons/lu';

const ChecklistSection = ({ items, loadError, onAddItem, onToggleChecked, onRemoveItem, onRetryLoad }) => {
    const [newItemTitle, setNewItemTitle] = useState('');
    const [newItemRequired, setNewItemRequired] = useState(true);

    const requiredItems = items.filter(i => i.isRequired);
    const requiredDoneCount = requiredItems.filter(i => i.isChecked).length;

    const handleAdd = (e) => {
        e.preventDefault();
        const title = newItemTitle.trim();
        if (!title) return;
        onAddItem({ title, isRequired: newItemRequired });
        setNewItemTitle('');
        setNewItemRequired(true);
    };

    return (
        <div className="form-group checklist-section">
            <div className="attachments-header">
                <label>Checklist</label>
                {!loadError && requiredItems.length > 0 && (
                    <span className="attachments-count">{requiredDoneCount}/{requiredItems.length} required done</span>
                )}
            </div>

            {loadError ? (
                <div className="checklist-load-error">
                    <p className="checklist-error-text">{loadError}</p>
                    <button type="button" className="btn-text" onClick={onRetryLoad}>Retry</button>
                </div>
            ) : items.length === 0 ? (
                <p className="no-attachments-text">No checklist items yet.</p>
            ) : (
                <ul className="checklist-item-list">
                    {items.map(item => (
                        <li key={item.id} className="checklist-item-row">
                            <label className="checklist-item-label">
                                <input
                                    type="checkbox"
                                    checked={item.isChecked}
                                    onChange={() => onToggleChecked(item)}
                                />
                                <span className={item.isChecked ? 'checklist-item-done' : ''}>{item.title}</span>
                                {item.isRequired && <span className="checklist-required-badge">Required</span>}
                            </label>
                            <button
                                type="button"
                                className="checklist-remove-btn"
                                aria-label={`Remove ${item.title}`}
                                onClick={() => onRemoveItem(item.id)}
                            >
                                <LuX />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {!loadError && (
                <form className="checklist-add-form" onSubmit={handleAdd}>
                    <input
                        type="text"
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        placeholder="Add checklist item..."
                        aria-label="New checklist item title"
                    />
                    <label className="checklist-required-toggle">
                        <input
                            type="checkbox"
                            checked={newItemRequired}
                            onChange={(e) => setNewItemRequired(e.target.checked)}
                        />
                        Required
                    </label>
                    <button type="submit" className="btn-text">Add</button>
                </form>
            )}
        </div>
    );
};

ChecklistSection.propTypes = {
    items: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        isRequired: PropTypes.bool,
        isChecked: PropTypes.bool,
    })).isRequired,
    loadError: PropTypes.string,
    onAddItem: PropTypes.func.isRequired,
    onToggleChecked: PropTypes.func.isRequired,
    onRemoveItem: PropTypes.func.isRequired,
    onRetryLoad: PropTypes.func.isRequired,
};

export default ChecklistSection;
