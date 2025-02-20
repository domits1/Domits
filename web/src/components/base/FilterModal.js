import React, { useState, useEffect } from 'react';
import Slider from '@mui/material/Slider';
import './FilterModal.css';

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
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = 'auto';
      document.body.style.paddingRight = '0';
    }

    return () => {
      document.body.style.overflow = 'auto';
      document.body.style.paddingRight = '0';
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
    <div className="modal-overlay-filter" onClick={onClose}>
      <div className="modal-content-filter" onClick={(e) => e.stopPropagation()}>
        <h2>Filter Options</h2>

        {/* filter voor het prijs slider */}
        <div className="filter-section">
          <h3>Price Range</h3>
          <Slider
            sx={{
              '& .MuiSlider-thumb': {
                width: 30,
                height: 30,
                backgroundColor: '#ffffff',
                border: '1px solid #d3d3d3',
              },
              '& .MuiSlider-rail': {
                backgroundColor: '#e6e6e6',
              },
              '& .MuiSlider-track': {
                backgroundColor: '#4caf50',
                border: '1px solid #4caf50',
              },
              '& .MuiSlider-thumb:hover': {
                backgroundColor: '#e2e2e2',
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
          <div className="price-display">
            <span>Min: €{priceValues[0]}</span>
            <span>Max: €{priceValues[1]}</span>
          </div>
        </div>

        {/* filter voor room facilities */}
        <div className="filter-section">
          <h3>Room Facilities</h3>
          <div className="room-facilities-grid">
            <label className="room-facility-option">
              <input
                type="checkbox"
                name="tv"
                checked={roomFacilities.tv}
                onChange={handleRoomFacilityChange}
              />
              TV
            </label>
            <label className="room-facility-option">
              <input
                type="checkbox"
                name="minibar"
                checked={roomFacilities.minibar}
                onChange={handleRoomFacilityChange}
              />
              Minibar
            </label>
            <label className="room-facility-option">
              <input
                type="checkbox"
                name="balcony"
                checked={roomFacilities.balcony}
                onChange={handleRoomFacilityChange}
              />
              Balcony
            </label>
            <label className="room-facility-option">
              <input
                type="checkbox"
                name="bathtub"
                checked={roomFacilities.bathtub}
                onChange={handleRoomFacilityChange}
              />
              Bathtub
            </label>
            <label className="room-facility-option">
              <input
                type="checkbox"
                name="coffeeMaker"
                checked={roomFacilities.coffeeMaker}
                onChange={handleRoomFacilityChange}
              />
              Coffee Maker
            </label>
            <label className="room-facility-option">
              <input
                type="checkbox"
                name="safe"
                checked={roomFacilities.safe}
                onChange={handleRoomFacilityChange}
              />
              Safe
            </label>
            <label className="room-facility-option">
              <input
                type="checkbox"
                name="hairDryer"
                checked={roomFacilities.hairDryer}
                onChange={handleRoomFacilityChange}
              />
              Hair Dryer
            </label>
            <label className="room-facility-option">
              <input
                type="checkbox"
                name="desk"
                checked={roomFacilities.desk}
                onChange={handleRoomFacilityChange}
              />
              Desk
            </label>
          </div>
        </div>

        <div className="filter-section">
          <h3>Property Accessibility</h3>
          <label className="accessibility-option">
            <input
              type="checkbox"
              name="wheelchairAccessible"
              checked={propertyAccessibility.wheelchairAccessible}
              onChange={handlePropertyAccessibilityChange}
            />
            Wheelchair Accessible
          </label>
          <label className="accessibility-option">
            <input
              type="checkbox"
              name="elevator"
              checked={propertyAccessibility.elevator}
              onChange={handlePropertyAccessibilityChange}
            />
            Elevator Available
          </label>
          <label className="accessibility-option">
            <input
              type="checkbox"
              name="brailleSigns"
              checked={propertyAccessibility.brailleSigns}
              onChange={handlePropertyAccessibilityChange}
            />
            Braille Signs
          </label>
          <label className="accessibility-option">
            <input
              type="checkbox"
              name="stepFreeAccess"
              checked={propertyAccessibility.stepFreeAccess}
              onChange={handlePropertyAccessibilityChange}
            />
            Step-Free Access
          </label>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;