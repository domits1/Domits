import React from "react";
import editIcon from "../../../images/icons/edit-05.png";
import checkIcon from "../../../images/icons/checkPng.png";
import { limitBetween, formatFamilyLabel } from "../utils/guestDashboardUtils";
import "../styles/GuestFamilyRow.scss";


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
          <div className="booking-details__pi">
            <div className="booking-details__row">
              <div className="booking-details__label">Adults</div>
              <div className="booking-details__controls">
                <button
                  type="button"
                  className="pi-action cancel"
                  onClick={() => decrease("adults")}
                >
                  −
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
                />

                <button
                  type="button"
                  className="pi-action increment"
                  onClick={() => increase("adults")}
                >
                  +
                </button>
              </div>
            </div>

            <div className="booking-details__row">
              <div className="booking-details__label">Kids</div>
              <div className="booking-details__controls">
                <button
                  type="button"
                  className="pi-action cancel"
                  onClick={() => decrease("kids")}
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
                />

                <button
                  type="button"
                  className="pi-action increment"
                  onClick={() => increase("kids")}
                >
                  +
                </button>
              </div>
            </div>

            <div className="booking-details__row">
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
          >
            <img src={editIcon} alt="" />
          </button>
        ) : (
          <div className="pi-actions">
            <button
              type="button"
              className="pi-action save"
              onClick={onSave}
            >
              <img src={checkIcon} alt="" />
            </button>
            <button
              type="button"
              className="pi-action cancel"
              onClick={onCancelEdit}
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
