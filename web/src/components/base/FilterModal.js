import React, { useState, useEffect } from 'react';
import Slider from '@mui/material/Slider'; 
import './FilterModal.css';

const FilterModal = ({ isOpen, onClose }) => {
  const [values, setValues] = useState([100, 800]); 

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

  const handleSliderChange = (event, newValues) => {
    setValues(newValues); 
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Filter Options</h2>

        <div className="price-selection">
          <h3>Price</h3>
          
          
          <div className="price-slider">
            <Slider
              value={values} 
              onChange={handleSliderChange} 
              valueLabelDisplay="auto" 
              min={0} 
              max={1000}
              step={1} 
              valueLabelFormat={(value) => `€${value}`} 
              disableSwap
            />
          </div>

          <div className="price-display">
            <span>Min: €{values[0]}</span>
            <span>Max: €{values[1]}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
