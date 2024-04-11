import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { FaTimes ,FaSearchLocation, FaMapMarkerAlt, FaMapPin } from 'react-icons/fa';
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import Select from 'react-select';
import 'react-datepicker/dist/react-datepicker.css';
import './SearchBar.css';

export const SearchBar = ({ setSearchResults }) => {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [accommodation, setAccommodation] = useState('');
  const [address, setAddress] = useState('');
  const [showResults, setShowResults] = useState(false);

  const handleChange = (address) => {
    setAddress(address);
  };

  const handleSelect = async (address) => {
    setAddress(address);
    try {
      const results = await geocodeByAddress(address);
      const latLng = await getLatLng(results[0]);
      // console.log('Geocode Success', latLng);
      setShowResults(true);
    } catch (error) {
      // console.error('Error', error);
      setShowResults(false);
    }
  };

  // Verbinding met API Gateway
  const handleSearch = async () => {
    const typeQueryParam = accommodation ? `type=${accommodation}` : '';
    const locationQueryParam = address ? `&searchTerm=${address}` : '';
    const url = `https://dviy5mxbjj.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodationTypes?${typeQueryParam}${locationQueryParam}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      // console.log("Data received in SearchBar:", data);
      setSearchResults(data); // Dit stuurt de data naar de App component
    } catch (error) {
      // console.error('Error fetching accommodations:', error);
    }
  };

  return (
    <div className="bar">
      <div className="location">
        <p className="searchTitle">Location</p>

        <PlacesAutocomplete value={address} onChange={handleChange} onSelect={handleSelect} searchOptions={{ language: 'en' }}>
  {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
    <div className="autocomplete-container searchInputContainer" style={{ marginTop: '10px', position: 'relative' }}>
      <input {...getInputProps({
        placeholder: 'Search Places ....',
        className: 'searchBar',
      })}
      />
      {address && (
        <button
          onClick={() => handleChange('')}
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          <FaTimes  style={{ color: 'red', fontSize: '16px', marginBottom: '25px' }} />
        </button>
      )}
      <div
        className="suggestions-container"
        style={{
          marginTop: '15px',
          fontWeight: 'bold',
          marginLeft: '15%',
        }}
      >
        {loading && <div>Loading...</div>}
        {suggestions.map((suggestion) => {
          if (suggestion.types.includes('locality') || suggestion.types.includes('country')) {
            const parts = suggestion.description.split(', ');
            const filteredDescription = parts.length > 1 ? `${parts[0]}, ${parts[parts.length - 1]}` : parts[0];

            return (
              <div
                {...getSuggestionItemProps(suggestion, {
                  style: {
                    backgroundColor: suggestion.active ? '#f0f0f0' : '#fff',
                    padding: '18px 10px',
                    borderBottom: '2px solid #ddd',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s ease',
                    fontSize: '15px',
                    color: '#000',
                    borderRadius: '3px',
                    margin: '0',
                    display: 'flex',
                    width: '300px',
                  }
                })}
                className="suggestion-item"
              >
                <FaMapMarkerAlt style={{
                  marginRight: '10px',
                  backgroundColor: 'lightgray',
                  border: '1px solid #ccc',
                  borderRadius: '25%',
                  padding: '5px',
                  fontSize: '20px',
                  color: '#000'
                }} />
                {filteredDescription}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  )}
</PlacesAutocomplete>
      </div>
      <div className='check-in' onClick={() => document.getElementById('checkInPicker').click()} style={{ cursor: 'pointer' }}>
        <p className="searchTitleCenter">Check in</p>
        <div className="searchInputContainer" style={{ marginTop: '10px' }}>
          <DatePicker
            className="searchbar-input"
            id="checkInPicker"
            selected={checkIn}
            onChange={(date) => setCheckIn(date)}
            placeholderText="Start date"
            dateFormat="dd/MM/yyyy"
          />
        </div>
      </div>

      <div className='check-out' onClick={() => document.getElementById('checkOutPicker').click()}>
        <p className="searchTitleCenter">Check out</p>
        <div className='searchInputContainer' style={{ marginTop: '10px' }}>
          <DatePicker
            className="searchbar-input"
            id="checkOutPicker"
            selected={checkOut}
            onChange={(date) => setCheckOut(date)}
            placeholderText="End date"
            dateFormat="dd/MM/yyyy"
          />
        </div>
      </div>

      <div className="accommodation searchInputContainer">
        <p className="searchTitleCenterAcco searchTitleAccommodation">Accommodation</p>

        <Select
  value={accommodation ? { label: accommodation, value: accommodation } : null}
  onChange={(selectedOption) => setAccommodation(selectedOption ? selectedOption.value : '')}
  options={[
    { value: 'Apartment', label: <><FaMapPin /> Apartment</> },
    { value: 'House', label: <><FaMapPin /> House</> },
    { value: 'Villa', label: <><FaMapPin /> Villa</> },
    { value: 'Boathouse', label: <><FaMapPin /> Boathouse</> },
    { value: 'Camper', label: <><FaMapPin /> Camper</> },
  ]}
  placeholder="Type of accommodation"
  isSearchable={false}
  isClearable={true}
  styles={{
    control: (provided) => ({
      ...provided,
      border: 'none',
      boxShadow: 'none',
      background: 'none',
      minHeight: '0',
      padding: '0',
      margin: '0',
      cursor: 'pointer',
      width: '150px',
      position: 'relative',  // Zorgt ervoor dat de absolute positionering binnen deze context werkt
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    dropdownIndicator: () => ({ display: 'none' }),
    placeholder: (provided) => ({
      ...provided,
      color: 'gray',
      background: 'none',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#0fa616' : state.isFocused ? '#0fa616' : provided.backgroundColor,
      color: state.isSelected || state.isFocused ? 'black' : provided.color,
      borderRadius: state.isSelected ? '10px' : state.isFocused ? '10px' : '0px',
      fontWeight: state.isSelected ? 'bold' : 'normal',
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: '#ffff',
      borderRadius: '8px',
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
      padding: '5px',
      width: '187px',
      maxHeight: '300px',
      marginRight: '40px',
      borderRadius: '15px',
      textAlign: 'left',
    }),
    singleValue: (provided) => ({
      ...provided,
      fontWeight: 'normal',
      fontSize: '13px',
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: 'red',
      position: 'absolute', 
      left: '0px',  
      top: '50%',  
      transform: 'translateY(-50%)', 
    }),
  }}
/>
      </div>

      <button className="searchbar-button" type="button" onClick={handleSearch}>
        <FaSearchLocation size={16} style={{ position: 'relative', top: '-2px' }} />
      </button>
    </div>
  );
};