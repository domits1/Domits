import React from "react";
import PropTypes from "prop-types";
import editIcon from "../../../images/icons/edit-05.png";
import checkIcon from "../../../images/icons/checkPng.png";
import crossIcon from "../../../images/icons/cross.png";

const EditActionButtons = ({isEditing, onSave, onToggle, saveAlt, editAlt}) => (
    <div className="infoBoxActions">
        <button
            type="button"
            onClick={isEditing ? onSave : undefined}
            className={`settings-icon-background save-button${isEditing ? "" : " is-hidden"}`}
            aria-label={saveAlt}
            disabled={!isEditing}
        >
            <img src={checkIcon} alt="" className="save-check-icon" aria-hidden="true" />
        </button>
        <button
            type="button"
            onClick={onToggle}
            className={`settings-icon-background edit-button${isEditing ? " is-active" : ""}`}
            aria-label={isEditing ? "Cancel edit" : editAlt}
        >
            {isEditing ? (
                <img src={crossIcon} alt="" className="cancel-icon" aria-hidden="true" />
            ) : (
                <img src={editIcon} alt="" className="guest-edit-icon" aria-hidden="true" />
            )}
        </button>
    </div>
);

const EditableInfoBox = ({
    label,
    isEditing,
    editContent,
    displayContent,
    onSave,
    onToggle,
    saveAlt,
    editAlt,
}) => (
    <div className="InfoBox">
        <div className="infoBoxText">
            <span>{label}</span>
            {isEditing ? editContent : displayContent}
        </div>
        <EditActionButtons
            isEditing={isEditing}
            onSave={onSave}
            onToggle={onToggle}
            saveAlt={saveAlt}
            editAlt={editAlt}
        />
    </div>
);

EditActionButtons.propTypes = {
    isEditing: PropTypes.bool.isRequired,
    onSave: PropTypes.func,
    onToggle: PropTypes.func.isRequired,
    saveAlt: PropTypes.string.isRequired,
    editAlt: PropTypes.string.isRequired,
};

EditableInfoBox.propTypes = {
    label: PropTypes.string.isRequired,
    isEditing: PropTypes.bool.isRequired,
    editContent: PropTypes.node.isRequired,
    displayContent: PropTypes.node.isRequired,
    onSave: PropTypes.func,
    onToggle: PropTypes.func.isRequired,
    saveAlt: PropTypes.string.isRequired,
    editAlt: PropTypes.string.isRequired,
};

export default EditableInfoBox;
