import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Slider from '@mui/material/Slider';
import FilterLogic from './FilterLogic';
import './FilterMain.css';
import { MAX_PRICE, MIN_PRICE } from '../../constants/searchFilters';

const EURO_SYMBOL = '\u20AC';

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
    fetchFilteredAccommodations,
    handleSeasonChange,
    seasonFilter,
    setShowMoreSeasonTypes,
    showMoreSeasonTypes,
    handleEcoChange,
    ecoScore,
  } = FilterLogic({ onFilterApplied });

  const [minInputValue, setMinInputValue] = useState(`${EURO_SYMBOL}${priceValues[0]}`);
  const [maxInputValue, setMaxInputValue] = useState(`${EURO_SYMBOL}${priceValues[1]}`);

  useEffect(() => {
    setMinInputValue(`${EURO_SYMBOL}${priceValues[0]}`);
    setMaxInputValue(`${EURO_SYMBOL}${priceValues[1]}`);
  }, [priceValues]);

  const handleSliderChange = (_event, newValues) => {
    setPriceValues(newValues);
  };

  const handleSliderChangeCommitted = () => {
    fetchFilteredAccommodations();
  };

  const handleMinInputChange = (event) => {
    const rawValue = event.target.value;
    setMinInputValue(rawValue);

    const numericValue = rawValue.replaceAll(/\D/g, '');

    if (numericValue) {
      const newValue = Number.parseInt(numericValue, 10);
      if (newValue >= MIN_PRICE && newValue <= priceValues[1]) {
        handlePriceChange(0, newValue);
        fetchFilteredAccommodations();
      }
    }
  };

  const handleMaxInputChange = (event) => {
    const rawValue = event.target.value;
    setMaxInputValue(rawValue);

    const numericValue = rawValue.replaceAll(/\D/g, '');

    if (numericValue) {
      const newValue = Number.parseInt(numericValue, 10);
      if (newValue <= MAX_PRICE && newValue >= priceValues[0]) {
        handlePriceChange(1, newValue);
        fetchFilteredAccommodations();
      }
    }
  };

  const handleBlur = () => {
    setMinInputValue(`${EURO_SYMBOL}${priceValues[0]}`);
    setMaxInputValue(`${EURO_SYMBOL}${priceValues[1]}`);
  };

  return (
    <div>
      <div className="filter-section">
        <div className="FilterTitle">Price Range</div>
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
            min={MIN_PRICE}
            max={MAX_PRICE}
            step={1}
            valueLabelFormat={(value) => `${EURO_SYMBOL}${value}`}
            disableSwap
          />
          <div className="price-inputs">
            <div>
              <label htmlFor="filter-price-min">Min:</label>
              <input
                id="filter-price-min"
                type="text"
                value={minInputValue}
                onChange={handleMinInputChange}
                onBlur={handleBlur}
              />
            </div>
            <div>
              <label htmlFor="filter-price-max">Max:</label>
              <input
                id="filter-price-max"
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
        <div className="FilterTitle">Facilities</div>
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
        <button
          type="button"
          onClick={() => setShowMoreFacilities(!showMoreFacilities)}
          className="show-more-text"
        >
          {showMoreFacilities ? 'Show Less' : 'Show More'}
        </button>
      </div>

      <div className="filter-section">
        <div className="FilterTitle">Property Type</div>
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
        <button
          type="button"
          onClick={() => setShowMorePropertyTypes(!showMorePropertyTypes)}
          className="show-more-text"
        >
          {showMorePropertyTypes ? 'Show Less' : 'Show More'}
        </button>
      </div>

      <div className="filter-section">
        <div className="FilterTitle">Seasons</div>
        <div className="facility-list">
          {Object.keys(seasonFilter).slice(0, 5).map((season) => (
            <label key={season} className="facility-item">
              <input
                type="checkbox"
                name={season}
                checked={seasonFilter[season]}
                onChange={handleSeasonChange}
                className="filter-select-option"
              />
              {season.charAt(0).toUpperCase() + season.slice(1)}
            </label>
          ))}
          {showMoreSeasonTypes &&
            Object.keys(seasonFilter)
              .slice(5)
              .map((season) => (
                <label key={season} className="facility-item">
                  <input
                    type="checkbox"
                    name={season}
                    checked={seasonFilter[season]}
                    onChange={handleSeasonChange}
                    className="filter-select-option"
                  />
                  {season.charAt(0).toUpperCase() + season.slice(1)}
                </label>
              ))}
          <button
            type="button"
            onClick={() => setShowMoreSeasonTypes(!showMoreSeasonTypes)}
            className="show-more-text"
          >
            {showMoreSeasonTypes ? 'Show Less' : 'Show More'}
          </button>
        </div>
      </div>

      <div className="filter-section">
        <div className="FilterTitle">Eco Score</div>
        <div className="facility-list">
          {Object.keys(ecoScore).slice(0, 5).map((eco) => (
            <label key={eco} className="facility-item">
              <input
                type="checkbox"
                name={eco}
                checked={ecoScore[eco]}
                onChange={handleEcoChange}
                className="filter-select-option"
              />
              {eco.charAt(0).toUpperCase() + eco.slice(1)}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

FilterUi.propTypes = {
  onFilterApplied: PropTypes.func,
};

export default FilterUi;