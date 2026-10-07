import React from 'react';
import PropTypes from 'prop-types';
import { LuTriangleAlert } from 'react-icons/lu';

const ConfirmDialog = ({ confirmDialog, onCancel }) => {
    if (!confirmDialog.isOpen) return null;

    return (
        <div className="confirm-modal-overlay">
            <div className="confirm-modal-content">
                <div className="confirm-modal-icon"><LuTriangleAlert /></div>
                <h3>{confirmDialog.title}</h3>
                <p>{confirmDialog.message}</p>
                <div className="confirm-modal-actions">
                    <button className="btn-text" onClick={onCancel}>{confirmDialog.cancelText}</button>
                    <button className="btn-danger" onClick={confirmDialog.onConfirm}>{confirmDialog.confirmText}</button>
                </div>
            </div>
        </div>
    );
};

ConfirmDialog.propTypes = {
    confirmDialog: PropTypes.shape({
        isOpen: PropTypes.bool,
        title: PropTypes.node,
        message: PropTypes.node,
        cancelText: PropTypes.node,
        confirmText: PropTypes.node,
        onConfirm: PropTypes.func,
    }).isRequired,
    onCancel: PropTypes.func.isRequired,
};

export default ConfirmDialog;
