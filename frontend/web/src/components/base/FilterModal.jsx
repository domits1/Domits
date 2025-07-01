import React, { useState, useEffect } from "react";
import Slider from "@mui/material/Slider";
import styles from "./FilterModal.module.scss";

const FilterModal = ({ isOpen, onClose }) => {
  const [priceValues, setPriceValues] = useState([0, 400]);
  const [roomFacilities, setRoomFacilities] = useState({
    tv: false,
    minibar: false,
    balcony: false,
    bathtub: false,
    coffeeMaker: false,
    safe: false,
    hairDryer: false,
    desk: false,
  });
  const [propertyAccessibility, setPropertyAccessibility] = useState({
    wheelchairAccessible: false,
    elevator: false,
    brailleSigns: false,
    stepFreeAccess: false,
  });

  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "auto";
      document.body.style.paddingRight = "0";
    }

    return () => {
      document.body.style.overflow = "auto";
      document.body.style.paddingRight = "0";
    };
  }, [isOpen]);

  const handleRoomFacilityChange = (event) => {
    setRoomFacilities({ ...roomFacilities, [event.target.name]: event.target.checked });
  };

  const handlePropertyAccessibilityChange = (event) => {
    setPropertyAccessibility({ ...propertyAccessibility, [event.target.name]: event.target.checked });
  };

  if (!isOpen) return null;

  return (
    <div className={styles["filter-modal-container"]}>
      <div className={styles["modal-overlay-filter"]} onClick={onClose}>
        <div className={styles["modal-content-filter"]} onClick={(e) => e.stopPropagation()}>
          <div style={{ padding: "0px", height: "100%", boxSizing: "border-box" }}>
            <div className={styles["filter-modal-header"]}>
              <h2 className="filter-text">Filter</h2>
              <button className={styles["filter-modal-close-btn"]} onClick={onClose} aria-label="Close">
                &times;
              </button>
            </div>
            <hr />

            <div className={styles["filter-section"]}>
              <h3>Price Range</h3>
              <Slider
                sx={{
                  "& .MuiSlider-thumb": {
                    width: 27,
                    height: 27,
                    backgroundColor: "#ffffff",
                    border: "1px solid #d3d3d3",
                  },
                  "& .MuiSlider-rail": {
                    backgroundColor: "#e6e6e6",
                  },
                  "& .MuiSlider-track": {
                    backgroundColor: "#4caf50",
                    border: "1px solid #4caf50",
                  },
                  "& .MuiSlider-thumb:hover": {
                    backgroundColor: "#e2e2e2",
                  },
                }}
                value={priceValues}
                onChange={(e, newValues) => setPriceValues(newValues)}
                valueLabelDisplay="auto"
                min={15}
                max={400}
                step={1}
                valueLabelFormat={(value) => `€${value}`}
                disableSwap
              />
              <div className={styles["price-display"]}>
                <span>Min: €{priceValues[0]}</span>
                <span>Max: €{priceValues[1]}</span>
              </div>
            </div>

            <div className={styles["filter-section"]}>
              <h3>Room Facilities</h3>
              <div className={styles["room-facilities-grid"]}>
                {Object.entries(roomFacilities).map(([key, value]) => (
                  <label key={key} className={styles["room-facility-option"]}>
                    <input type="checkbox" name={key} checked={value} onChange={handleRoomFacilityChange} />
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
                  </label>
                ))}
              </div>
            </div>

            <div className={styles["filter-section"]}>
              <h3>Property Accessibility</h3>
              {Object.entries(propertyAccessibility).map(([key, value]) => (
                <label key={key} className={styles["accessibility-option"]}>
                  <input type="checkbox" name={key} checked={value} onChange={handlePropertyAccessibilityChange} />
                  {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
