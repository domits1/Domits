// GuestFamilyRow.jsx
import React from "react";
import editIcon from "../../../images/icons/edit-05.png";
import checkIcon from "../../../images/icons//checkPng.png";
import { limitBetween, formatFamilyLabel } from "../utils/guestDashboardUtils";

const GuestFamilyRow = ({
  userFamily,
  familyCounts,
  setFamilyCounts,
  isEdit,
  onStartEdit,
  onCancelEdit,
  onSave,
}) => {
  const increase = (key) =>
    setFamilyCounts((prev) => ({
      ...prev,
      [key]: limitBetween(prev[key] + 1),
    }));

  const decrease = (key) =>
    setFamilyCounts((prev) => ({
      ...prev,
      [key]: limitBetween(prev[key] - 1),
    }));

  return (
    <div className="pi-row">
      <div className="pi-left">
        <span className="pi-label">Family:</span>

        {!isEdit && (
          <span className="pi-value" title={userFamily || "-"}>
            {userFamily || "-"}
          </span>
        )}

        {isEdit && (
          <div
            className="booking-details__pi"
            style={{ display: "grid", gap: 8 }}
          >
            {/* Adults */}
            <div
              className="booking-details__row"
              style={{ gridTemplateColumns: "140px auto" }}
            >
              <div className="booking-details__label">Adults</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="pi-action cancel"
                  onClick={() => decrease("adults")}
                  aria-label="Decrease adults"
                >
                  
                </button>
                <input
                  className="pi-input"
                  type="number"
                  min={0}
                  max={20}
                  value={familyCounts.adults}
                  onChange={(e) =>
                    setFamilyCounts((prev) => ({
                      ...prev,
                      adults: limitBetween(Number(e.target.value) || 0),
                    }))
                  }
                  style={{ width: 90 }}
                />
                <button
                  type="button"
                  className="pi-action"
                  onClick={() => increase("adults")}
                  aria-label="Increase adults"
                >
                  <img
                    src={checkIcon}
                    alt=""
                    style={{ visibility: "hidden" }}
                  />
                  <span
                    style={{ position: "absolute", fontSize: 18, lineHeight: 1 }}
                  >
                    +
                  </span>
                </button>
              </div>
            </div>

            {/* Kids */}
            <div
              className="booking-details__row"
              style={{ gridTemplateColumns: "140px auto" }}
            >
              <div className="booking-details__label">Kids</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="pi-action cancel"
                  onClick={() => decrease("kids")}
                  aria-label="Decrease kids"
                >
                  −
                </button>
                <input
                  className="pi-input"
                  type="number"
                  min={0}
                  max={20}
                  value={familyCounts.kids}
                  onChange={(e) =>
                    setFamilyCounts((prev) => ({
                      ...prev,
                      kids: limitBetween(Number(e.target.value) || 0),
                    }))
                  }
                  style={{ width: 90 }}
                />
                <button
                  type="button"
                  className="pi-action"
                  onClick={() => increase("kids")}
                  aria-label="Increase kids"
                >
                  <img
                    src={checkIcon}
                    alt=""
                    style={{ visibility: "hidden" }}
                  />
                  <span
                    style={{ position: "absolute", fontSize: 18, lineHeight: 1 }}
                  >
                    +
                  </span>
                </button>
              </div>
            </div>

            {/* Preview */}
            <div
              className="booking-details__row"
              style={{ gridTemplateColumns: "140px auto" }}
            >
              <div className="booking-details__label">Preview</div>
              <div className="booking-details__value">
                {formatFamilyLabel(familyCounts)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pi-right">
        {!isEdit ? (
          <button
            type="button"
            className="pi-action"
            onClick={onStartEdit}
            aria-label="Edit Family"
          >
            <img src={editIcon} alt="" />
          </button>
        ) : (
          <div className="pi-actions">
            <button
              type="button"
              className="pi-action save"
              onClick={onSave}
              aria-label="Save"
            >
              <img src={checkIcon} alt="" />
            </button>
            <button
              type="button"
              className="pi-action cancel"
              onClick={onCancelEdit}
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

export default GuestFamilyRow;
