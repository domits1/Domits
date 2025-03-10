import React, { useState, useEffect } from 'react';
import Slider from '@mui/material/Slider';
import { FilterLogic } from './FilterLogic';
import './FilterMain.css';

const FilterUi = ({ onFilterApplied }) => {
  const {
    priceValues,
    setPriceValues,
    selectedFacilities,
    handleFacilityChange,
    selectedPropertyTypes,
    handlePropertyTypeChange,
    showMoreFacilities,
    setShowMoreFacilities,
    showMorePropertyTypes,
    setShowMorePropertyTypes,
    handlePriceChange,
    loading,
    fetchFilteredAccommodations,
  } = FilterLogic({ onFilterApplied });

  const [minInputValue, setMinInputValue] = useState(`€${priceValues[0]}`);
  const [maxInputValue, setMaxInputValue] = useState(`€${priceValues[1]}`);

  useEffect(() => {
    setMinInputValue(`€${priceValues[0]}`);
    setMaxInputValue(`€${priceValues[1]}`);
  }, [priceValues]);

  const handleSliderChange = (e, newValues) => {
    setPriceValues(newValues);
  };

  const handleSliderChangeCommitted = () => {
    fetchFilteredAccommodations();
  };

  const handleMinInputChange = (e) => {

    const rawValue = e.target.value;
    setMinInputValue(rawValue);

    const numericValue = rawValue.replace(/[^0-9]/g, '');

    if (numericValue) {
      const newValue = parseInt(numericValue, 10);
      if (newValue >= 15 && newValue <= priceValues[1]) {
        handlePriceChange(0, newValue);
        fetchFilteredAccommodations();
      }
    }
  };

  const handleMaxInputChange = (e) => {
    const rawValue = e.target.value;
    setMaxInputValue(rawValue);

    const numericValue = rawValue.replace(/[^0-9]/g, '');

    if (numericValue) {
      const newValue = parseInt(numericValue, 10);
      if (newValue <= 400 && newValue >= priceValues[0]) {
        handlePriceChange(1, newValue);
        fetchFilteredAccommodations();
      }
    }
  };

  
  const handleBlur = () => {
    setMinInputValue(`€${priceValues[0]}`);
    setMaxInputValue(`€${priceValues[1]}`);
  };

  return (
    <div>
      <div className="filter-section">
        <div className='FilterTitle'>Price Range</div>
        <div className="slider-container">
          <Slider
            sx={{
              '& .MuiSlider-thumb': {
                width: 27,
                height: 27,
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
            onChange={handleSliderChange}
            onChangeCommitted={handleSliderChangeCommitted}
            valueLabelDisplay="auto"
            min={15}
            max={400}
            step={1}
            valueLabelFormat={(value) => `€${value}`}
            disableSwap
          />
          <div className="price-inputs">
            <div>
              <label>Min:</label>
              <input
                type="text"
                value={minInputValue}
                onChange={handleMinInputChange}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label>Max:</label>
              <input
                type="text"
                value={maxInputValue}
                onChange={handleMaxInputChange}
                onBlur={handleBlur}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="filter-section">
        <div className='FilterTitle'>Facilities</div>
        <div className="facility-list">
          {Object.keys(selectedFacilities).slice(0, 5).map((facility) => (
            <label key={facility} className="facility-item">
              <input
                type="checkbox"
                name={facility}
                checked={selectedFacilities[facility]}
                onChange={handleFacilityChange}
                className="filter-select-option"
              />
              {facility.charAt(0).toUpperCase() + facility.slice(1)}
            </label>
          ))}
          {showMoreFacilities &&
            Object.keys(selectedFacilities)
              .slice(5)
              .map((facility) => (
                <label key={facility} className="facility-item">
                  <input
                    type="checkbox"
                    name={facility}
                    checked={selectedFacilities[facility]}
                    onChange={handleFacilityChange}
                    className="filter-select-option"
                  />
                  {facility.charAt(0).toUpperCase() + facility.slice(1)}
                </label>
              ))}
        </div>
        <span
          onClick={() => setShowMoreFacilities(!showMoreFacilities)}
          className="show-more-text"
        >
          {showMoreFacilities ? 'Show Less' : 'Show More'}
        </span>
      </div>

      <div className="filter-section">
        <div className='FilterTitle'>Property Type</div>
        <div className="facility-list">
          {Object.keys(selectedPropertyTypes).slice(0, 5).map((propertyType) => (
            <label key={propertyType} className="facility-item">
              <input
                type="checkbox"
                name={propertyType}
                checked={selectedPropertyTypes[propertyType]}
                onChange={handlePropertyTypeChange}
                className="filter-select-option"
              />
              {propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}
            </label>
          ))}
          {showMorePropertyTypes &&
            Object.keys(selectedPropertyTypes)
              .slice(5)
              .map((propertyType) => (
                <label key={propertyType} className="facility-item">
                  <input
                    type="checkbox"
                    name={propertyType}
                    checked={selectedPropertyTypes[propertyType]}
                    onChange={handlePropertyTypeChange}
                    className="filter-select-option"
                  />
                  {propertyType.charAt(0).toUpperCase() + propertyType.slice(1)}
                </label>
              ))}
        </div>
        <span
          onClick={() => setShowMorePropertyTypes(!showMorePropertyTypes)}
          className="show-more-text"
        >
          {showMorePropertyTypes ? 'Show Less' : 'Show More'}
        </span>
      </div>

    
    </div>
  );
};

export default FilterUi;