import React from "react";
import editIcon from "../../../images/icons/edit-05.png";
import checkIcon from "../../../images/icons/checkPng.png";

const GuestInfoRow = ({
  label,
  field,
  type = "text",
  value,
  isEdit,
  tempValue,
  onTempChange,
  onSave,
  onStartEdit,
  onCancelEdit,
  isVerifying,
  verificationCode,
  setVerificationCode,
}) => {
  const handleKeyDown = (e) => {
    if (e.key === "Enter") onSave(field);
  };

  const renderViewValue = () => (
    <span className="pi-value" title={value || "-"}>
      {value || "-"}
    </span>
  );

  const renderEmailInput = () => {
    if (isVerifying) {
      return (
        <input
          type="text"
          className="pi-input"
          placeholder="Verification code"
          value={verificationCode ?? ""}
          onChange={(e) => setVerificationCode(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      );
    }

    return (
      <input
        type="email"
        className="pi-input"
        value={tempValue ?? ""}
        onChange={(e) => onTempChange(field, e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
    );
  };

  const renderDefaultInput = () => (
    <input
      type={type}
      className="pi-input"
      value={tempValue ?? ""}
      onChange={(e) => onTempChange(field, e.target.value)}
      onKeyDown={handleKeyDown}
      autoFocus
    />
  );

  const renderEditInput = () => {
    if (field === "email") return renderEmailInput();
    return renderDefaultInput();
  };

  return (
    <div className="pi-row">
      <div className="pi-left">
        <span className="pi-label">{label}</span>
        {!isEdit ? renderViewValue() : renderEditInput()}
      </div>

      <div className="pi-right">
        {!isEdit ? (
          <button
            type="button"
            className="pi-action"
            onClick={() => onStartEdit(field)}
            aria-label={`Edit ${label}`}
          >
            <img src={editIcon} alt="" />
          </button>
        ) : (
          <div className="pi-actions">
            <button
              type="button"
              className="pi-action save"
              onClick={() => onSave(field)}
              aria-label="Save"
            >
              <img src={checkIcon} alt="" />
            </button>
            <button
              type="button"
              className="pi-action cancel"
              onClick={() => onCancelEdit(field)}
              aria-label="Cancel"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestInfoRow;
