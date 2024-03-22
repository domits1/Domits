import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { FaSearch, FaMapMarkerAlt, FaMapPin } from 'react-icons/fa';
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import Select from 'react-select';
import 'react-datepicker/dist/react-datepicker.css';
import './SearchBar.css';

export const SearchBar = ({ setResults }) => {
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
      console.log('Geocode Success', latLng);
      setShowResults(true);
    } catch (error) {
      console.error('Error', error);
      setShowResults(false);
    }
  };

  const handleRefreshClick = () => {
    window.location.reload();
  };

  return (
    <div className="bar">
      <div className="location">
        <p>Location</p>
        <PlacesAutocomplete
          value={address}
          onChange={handleChange}
          onSelect={handleSelect}
          searchOptions={{ language: 'en' }}
        >
          {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
            <div className="autocomplete-container">
              <input
                {...getInputProps({
                  placeholder: 'Search Places . . .',
                  className: 'searchBar',
                })}
              />
              <div className="suggestions-container" style={{ marginTop: '25px', fontWeight: 'bold', }}>
                {loading ? <div>Loading...</div> : null}

                {suggestions.map((suggestion) => {
                  if (suggestion.types.includes('locality') || suggestion.types.includes('country')) {
                    const style = {
                      backgroundColor: suggestion.active ? '#f0f0f0' : '#fff',
                      padding: '18px 10px',
                      borderBottom: '2px solid #ddd',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                      fontSize: '15px',
                      color: '#000',
                      borderRadius: '1px',
                      margin: '0',
                      display: 'flex',
                      alignItems: 'center',
                      width: '300px',
                    };

                    return (
                      <div
                        {...getSuggestionItemProps(suggestion, { style })}
                        className="suggestion-item"
                      >
                        <FaMapMarkerAlt
                          style={{
                            marginRight: '10px',
                            backgroundColor: 'lightgray',
                            border: '1px solid #ccc',
                            borderRadius: '25%',
                            padding: '5px',
                            fontSize: '20px',
                            color: '#000'
                          }}
                        />
                        {suggestion.description}
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
      <div className='check-in' onClick={() => document.getElementById('checkInPicker').click()}>
        <p>Check in</p>
        <div>
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
        <p>Check out</p>
        <div>
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
      <div className="accommodation">
        <p>Accommodation</p>
        <Select
          value={accommodation ? { label: accommodation, value: accommodation } : null}
          onChange={(selectedOption) => setAccommodation(selectedOption ? selectedOption.value : '')}
          options={[
            //icons voor accomendaties
            { value: 'Hotel', label: <><FaMapPin /> Hotel</> }, 
            { value: 'Apartment', label: <><FaMapPin /> Apartment</> }, 
            { value: 'Guesthouse', label: <><FaMapPin /> Guesthouse</> },
            { value: 'Villa', label: <><FaMapPin /> Villa</> }, 
            { value: 'Resort', label: <><FaMapPin /> Resort</> }, 
            { value: 'Hostel', label: <><FaMapPin /> Hostel</> }, 
          ]}
          placeholder="Type of accommodation"
          isSearchable={true}
          styles={{
            control: (provided) => ({
              ...provided,
              border: 'none',
              boxShadow: 'none',
              height: '40px',
            }),
            indicatorSeparator: () => ({ display: 'none' }),
            dropdownIndicator: () => ({ display: 'none' }),
            placeholder: (provided) => ({
              ...provided,
              color: '#666',
            }),
            option: (provided, state) => ({
              ...provided,
              fontWeight: state.isSelected ? 'bold' : 'normal',
            }),
            menu: (provided) => ({
              ...provided,
              backgroundColor: '#ffff',
              borderRadius: '8px',
              boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
              padding: '8px',
              width: '200px', 
              maxHeight: '300px', 
              overflowY: 'auto', 
            }),
          }}
        />
      </div>
      <button className="searchbar-button" type="button" onClick={handleRefreshClick}>
        {showResults}
        <FaSearch
          style={{ marginRight: '2px', cursor: 'pointer' }}

        />
      </button>
    </div>
  );
};