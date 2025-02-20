// code gemaakt door: @kacperfl 
//importeren van de benodigde modules
import React, { useState } from 'react';
import Slider from '@mui/material/Slider';
import './FilterMain.css';

const FilterModal = () => {
  const [priceValues, setPriceValues] = useState([15, 400]);
  const [selectedFacilities, setSelectedFacilities] = useState({
    // Alle mogelijke faciliteiten die een accommodatie kan hebben
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
// Alle mogelijke soorten accommodaties die een accommodatie kan hebben
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
  //op default staat de optie voor tonen van meer opties op false
  const [showMoreFacilities, setShowMoreFacilities] = useState(false);
  const [showMorePropertyTypes, setShowMorePropertyTypes] = useState(false);

  //Zorgt ervoor dat de ingevoerde prijs waarden correct worden bijgewerkt maar voorkomt dat de minimumprijs hoger wordt dan de maximumprijs.
  const handleInputChange = (index, value) => {
    const newValues = [...priceValues];
    newValues[index] = Number(value);
    if (newValues[0] <= newValues[1]) {
      setPriceValues(newValues);
    }
  };
//Functie om de geselecteerde faciliteiten aan te passen
  const handleFacilityChange = (event) => {
    setSelectedFacilities({
      ...selectedFacilities,
      [event.target.name]: event.target.checked,
    });
  };
//Functie om de geselecteerde soorten accommodaties aan te passen
  const handlePropertyTypeChange = (event) => {
    setSelectedPropertyTypes({
      ...selectedPropertyTypes,
      [event.target.name]: event.target.checked,
    });
  };
//Functie dat de checkoxes voor de ratings op default uit zet
  const [selectedRatings, setSelectedRatings] = useState({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  });
//Functie om de geselecteerde ratings aan te passen
  const handleRatingChange = (event) => {
    setSelectedRatings({
      ...selectedRatings,
      [event.target.name]: event.target.checked,
    });
  };

  return (
    <div>
      {/* Prijsfilter met een slider*/}
      <div className="filter-section">
        <div className='FilterTitle'>Price Range</div>
        <div className="slider-container">
          {/* Slider voor het selecteren van de prijs met styling er in */}
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
            //waarden voor de slider en de functie die de waarden bijwerkt
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
              {/* Input veld voor de minimale prijs */}
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
              {/* Input veld voor de maximale prijs */}
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
        <div className='FilterTitle'>Facilities</div>
        <div className="facility-list">

          {/* Alle mogelijke faciliteiten die een accommodatie kan hebben */}
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
          {/* Als er meer dan 5 faciliteiten zijn, dan worden de overige faciliteiten verborgen en kan de gebruiker deze tonen door op de tekst te klikken */}
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
        {/* Functie om meer opties aan gebruiker te laten tonen */}
        <span
          onClick={() => setShowMoreFacilities(!showMoreFacilities)}
          className="show-more-text"
        >
          {showMoreFacilities ? 'Show Less' : 'Show More'}
        </span>
      </div>

      {/* Property type filter met checkboxes */}
      <div className="filter-section">
        <div className='FilterTitle'>Property Type</div>
        <div className="facility-list">
          {/* Alle mogelijke soorten accommodaties die een accommodatie kan hebben */}
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
           {/* Als er meer dan 5 soorten accommodaties zijn, dan worden de overige soorten accommodaties verborgen en kan de gebruiker deze tonen door op de tekst te klikken */}
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

      {/* Rating filter met checkboxes */}
      <div className="filter-section">
        <div className='FilterTitle'>Property Rating</div>
        <div className="facility-list">
          {Object.keys(selectedRatings).map((rating) => (
            <label key={rating} className="facility-item">
              <input
                type="checkbox"
                name={rating}
                checked={selectedRatings[rating]}
                onChange={handleRatingChange}
                className="filter-select-option"
              />
              {rating} Star{rating > 1 ? 's' : ''}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FilterModal;
