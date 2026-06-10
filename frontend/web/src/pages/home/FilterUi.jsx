import { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import Slider from '@mui/material/Slider';
import { LanguageContext } from '../../context/LanguageContext';
import en from '../../content/en.json';
import nl from '../../content/nl.json';
import de from '../../content/de.json';
import es from '../../content/es.json';
import amenities from '../../store/amenities';
import FilterLogic from './FilterLogic';
import './FilterMain.css';

const contentByLanguage = { en, nl, de, es };

const EURO_SYMBOL = '\u20AC';

// Group the canonical amenity list (src/store/amenities.js) by category so the
// filter always reflects every amenity a host can select.
const amenitiesByCategory = amenities.reduce((groups, amenity) => {
  if (!groups[amenity.category]) {
    groups[amenity.category] = [];
  }
  groups[amenity.category].push(amenity);
  return groups;
}, {});

const amenityCategories = Object.keys(amenitiesByCategory).sort((a, b) =>
  a.localeCompare(b)
);

const amenityById = amenities.reduce((map, amenity) => {
  map[amenity.id] = amenity;
  return map;
}, {});

// Most-commonly-filtered amenities shown in the collapsed sidebar preview.
// ids match src/store/amenities.js.
const POPULAR_AMENITY_IDS = ['1', '2', '3', '4', '59', '60', '82', '83', '92', '93'];

const popularAmenities = POPULAR_AMENITY_IDS.map((id) => amenityById[id]).filter(Boolean);

const FilterUi = ({ onFilterApplied }) => {
  const {
    priceBounds,
    priceValues,
    setPriceValues,
    selectedAmenities,
    handleAmenityChange,
    handlePriceChange,
    handleResetFilters,
    fetchFilteredAccommodations,
    roomsAndBeds,
    handleRoomChange,
    bookingOptions,
    handleBookingOptionChange,
    error,
  } = FilterLogic({ onFilterApplied });

  const { language } = useContext(LanguageContext);
  const panelLabels =
    contentByLanguage[language]?.homepage?.filters?.panel ??
    en.homepage.filters.panel;

  const [amenitiesModalOpen, setAmenitiesModalOpen] = useState(false);

  const renderAmenityCheckbox = (amenity) => (
    <label key={amenity.id} className="facility-item">
      <input
        type="checkbox"
        checked={selectedAmenities.includes(amenity.id)}
        onChange={() => handleAmenityChange(amenity.id)}
        className="filter-select-option"
      />
      {amenity.amenity}
    </label>
  );

  const renderAmenityCategory = (category) => (
    <div key={category} className="amenity-category">
      <div className="amenity-category-title">{category}</div>
      <div className="facility-list">
        {amenitiesByCategory[category].map(renderAmenityCheckbox)}
      </div>
    </div>
  );

  const [minInputValue, setMinInputValue] = useState(`${EURO_SYMBOL}${priceValues[0]}`);
  const [maxInputValue, setMaxInputValue] = useState(`${EURO_SYMBOL}${priceValues[1]}`);

  useEffect(() => {
    setMinInputValue(`${EURO_SYMBOL}${priceValues[0]}`);
    setMaxInputValue(`${EURO_SYMBOL}${priceValues[1]}`);
  }, [priceValues]);

  const handleSliderChange = (_event, newValues) => {
    setPriceValues(newValues);
  };

  const handleMinInputChange = (event) => {
    const rawValue = event.target.value;
    setMinInputValue(rawValue);

    const numericValue = rawValue.replaceAll(/\D/g, '');

    if (numericValue) {
      const newValue = Number.parseInt(numericValue, 10);
      if (newValue >= priceBounds[0] && newValue <= priceValues[1]) {
        handlePriceChange(0, newValue);
      }
    }
  };

  const handleMaxInputChange = (event) => {
    const rawValue = event.target.value;
    setMaxInputValue(rawValue);

    const numericValue = rawValue.replaceAll(/\D/g, '');

    if (numericValue) {
      const newValue = Number.parseInt(numericValue, 10);
      if (newValue <= priceBounds[1] && newValue >= priceValues[0]) {
        handlePriceChange(1, newValue);
      }
    }
  };

  const handleBlur = () => {
    setMinInputValue(`${EURO_SYMBOL}${priceValues[0]}`);
    setMaxInputValue(`${EURO_SYMBOL}${priceValues[1]}`);
  };

  const triggerClickAnimation = (event) => {
    const button = event.currentTarget;
    button.classList.remove('is-clicked');
    // Force reflow so the animation restarts on every click.
    button.getBoundingClientRect();
    button.classList.add('is-clicked');
  };

  const handleApplyClick = (event) => {
    triggerClickAnimation(event);
    fetchFilteredAccommodations();
  };

  const handleResetClick = (event) => {
    triggerClickAnimation(event);
    handleResetFilters();
  };

  return (
    <div>
      {error && <output className="filter-message">{error}</output>}
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
            valueLabelDisplay="auto"
            min={priceBounds[0]}
            max={priceBounds[1]}
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
          {popularAmenities.map(renderAmenityCheckbox)}
        </div>
        <button
          type="button"
          onClick={() => setAmenitiesModalOpen(true)}
          className="show-more-text"
        >
          Show More
        </button>
      </div>

      {amenitiesModalOpen && (
        <div className="amenities-modal-overlay">
          <button
            type="button"
            className="amenities-modal-backdrop"
            aria-label="Close amenities"
            onClick={() => setAmenitiesModalOpen(false)}
          />
          <dialog
            className="amenities-modal"
            open
            aria-modal="true"
            aria-label="All amenities"
          >
            <div className="amenities-modal-header">
              <span>Amenities</span>
              <button
                type="button"
                className="amenities-modal-close"
                aria-label="Close amenities"
                onClick={() => setAmenitiesModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="amenities-modal-body">
              {amenityCategories.map(renderAmenityCategory)}
            </div>
            <div className="amenities-modal-footer">
              <button
                type="button"
                className="filter-apply-btn"
                onClick={(event) => {
                  triggerClickAnimation(event);
                  setAmenitiesModalOpen(false);
                  fetchFilteredAccommodations();
                }}
              >
                {panelLabels.apply}
              </button>
            </div>
          </dialog>
        </div>
      )}

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

      <div className="filter-actions">
        <button
          type="button"
          className="filter-reset-btn"
          onClick={handleResetClick}
          onAnimationEnd={(event) => event.currentTarget.classList.remove('is-clicked')}
        >
          {panelLabels.reset}
        </button>
        <button
          type="button"
          className="filter-apply-btn"
          onClick={handleApplyClick}
          onAnimationEnd={(event) => event.currentTarget.classList.remove('is-clicked')}
        >
          {panelLabels.apply}
        </button>
      </div>
    </div>
  );
};

FilterUi.propTypes = {
  onFilterApplied: PropTypes.func,
};

export default FilterUi;
