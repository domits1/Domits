import React, { useState } from 'react';
import Slider from '@mui/material/Slider';
import './FilterMain.css';

const FilterModal = () => {
  const [priceValues, setPriceValues] = useState([15, 400]);
  const [selectedFacilities, setSelectedFacilities] = useState({
    wifi: false,
    parking: false,
    gym: false,
    spa: false,
    swimmingPool: false,
    restaurant: false,
    petFriendly: false,
    airConditioning: false,
    breakfast: false,
    bar: false,
  });

  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState({
    apartment: false,
    villa: false,
    bungalow: false,
    studio: false,
    penthouse: false,
    cottage: false,
    townhouse: false,
    cabin: false,
    chalet: false,
    duplex: false,
    mansion: false,
    farmstay: false,
  });

  const [showMoreFacilities, setShowMoreFacilities] = useState(false);
  const [showMorePropertyTypes, setShowMorePropertyTypes] = useState(false);

  const handleInputChange = (index, value) => {
    const newValues = [...priceValues];
    newValues[index] = Number(value);
    if (newValues[0] <= newValues[1]) {
      setPriceValues(newValues);
    }
  };

  const handleFacilityChange = (event) => {
    setSelectedFacilities({
      ...selectedFacilities,
      [event.target.name]: event.target.checked,
    });
  };

  const handlePropertyTypeChange = (event) => {
    setSelectedPropertyTypes({
      ...selectedPropertyTypes,
      [event.target.name]: event.target.checked,
    });
  };

  return (
    <div>
      {/* Prijsfilter met border */}
      <div className="filter-section">
        <h3>Price Range</h3>
        <div className="slider-container">
          <Slider
            sx={{
              '& .MuiSlider-thumb': {
                width: 25,
                height: 25,
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
          <div className="price-inputs">
            <div>
              <label>Min:</label>
              <input
                type="text"
                value={`€${priceValues[0] || ''}`}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, ''); 
                  handleInputChange(0, value);
                }}
              />
            </div>
            <div>
              <label>Max:</label>
              <input
                type="text"
                value={`€${priceValues[1] || ''}`}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, ''); 
                  handleInputChange(1, value);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Facility filter met checkboxes */}
      <div className="filter-section">
        <h3>Facilities</h3>
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

      {/* Property type filter met checkboxes */}
      <div className="filter-section">
        <h3>Property Type</h3>
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
        {/* Functie om meer opties aan gebruiker te laten tonen */}
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

export default FilterModal;
