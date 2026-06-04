import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import Slider from '@mui/material/Slider';
import FilterLogic from './FilterLogic';
import './FilterMain.css';
import { MAX_PRICE, MIN_PRICE } from '../../constants/searchFilters';

const EURO_SYMBOL = '\u20AC';

const AMENITY_LABELS = {
  wifi: 'WiFi',
  parking: 'Parking',
  gym: 'Gym',
  spa: 'Spa',
  swimmingPool: 'Swimming Pool',
  restaurant: 'Restaurant',
  petFriendly: 'Pet Friendly',
  airConditioning: 'Air Conditioning',
  breakfast: 'Breakfast',
  bar: 'Bar',
};

const FilterUi = ({ onFilterApplied }) => {
  const {
    priceValues,
    setPriceValues,
    selectedAmenities,
    handleAmenityChange,
    showMoreFacilities,
    setShowMoreFacilities,
    handlePriceChange,
    fetchFilteredAccommodations,
    roomsAndBeds,
    handleRoomChange,
    bookingOptions,
    handleBookingOptionChange,
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
        const nextPriceValues = handlePriceChange(0, newValue);
        fetchFilteredAccommodations({ priceValues: nextPriceValues });
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
        const nextPriceValues = handlePriceChange(1, newValue);
        fetchFilteredAccommodations({ priceValues: nextPriceValues });
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
        <div className="FilterTitle">Amenities</div>
        <div className="facility-list">
          {Object.keys(selectedAmenities).slice(0, 5).map((key) => (
            <label key={key} className="facility-item">
              <input
                type="checkbox"
                name={key}
                checked={selectedAmenities[key]}
                onChange={handleAmenityChange}
                className="filter-select-option"
              />
              {AMENITY_LABELS[key] ?? key}
            </label>
          ))}
          {showMoreFacilities &&
            Object.keys(selectedAmenities)
              .slice(5)
              .map((key) => (
                <label key={key} className="facility-item">
                  <input
                    type="checkbox"
                    name={key}
                    checked={selectedAmenities[key]}
                    onChange={handleAmenityChange}
                    className="filter-select-option"
                  />
                  {AMENITY_LABELS[key] ?? key}
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
        <div className="FilterTitle">Rooms &amp; Beds</div>
        {[
          { key: 'bedrooms', label: 'Bedrooms' },
          { key: 'beds', label: 'Beds' },
          { key: 'bathrooms', label: 'Bathrooms' },
        ].map(({ key, label }) => (
          <div key={key} className="room-counter">
            <span className="room-counter-label">{label}</span>
            <div className="counter-controls">
              <button
                type="button"
                className="counter-btn"
                onClick={() => handleRoomChange(key, -1)}
                disabled={roomsAndBeds[key] === 0}
                aria-label={`Decrease ${label}`}
              >
                −
              </button>
              <span className="counter-value">
                {roomsAndBeds[key] === 0 ? 'Any' : roomsAndBeds[key]}
              </span>
              <button
                type="button"
                className="counter-btn"
                onClick={() => handleRoomChange(key, 1)}
                aria-label={`Increase ${label}`}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="filter-section">
        <div className="FilterTitle">Booking Options</div>
        <div className="facility-list">
          <label className="facility-item">
            <input
              type="checkbox"
              name="bookInstantly"
              checked={bookingOptions.bookInstantly}
              onChange={handleBookingOptionChange}
              className="filter-select-option"
            />
            <span>Book Instantly</span>
          </label>
          <label className="facility-item">
            <input
              type="checkbox"
              name="bookingRequest"
              checked={bookingOptions.bookingRequest}
              onChange={handleBookingOptionChange}
              className="filter-select-option"
            />
            <span>Booking Request</span>
          </label>
        </div>
      </div>

    </div>
  );
};

FilterUi.propTypes = {
  onFilterApplied: PropTypes.func,
};

export default FilterUi;
