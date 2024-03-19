import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { FaSearch } from 'react-icons/fa';
import Select from 'react-select';
import 'react-datepicker/dist/react-datepicker.css';
import './SearchBar.css';


export const SearchBar = ({ setResults }) => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [accommodation, setAccommodation] = useState('');

  const handleRefreshClick = () => {
    window.location.reload();
  };

  const fetchData = (value, searchType) => {
    if (!value.trim()) {
      setResults([]);
      return;
    }
  
    const partialValue = encodeURIComponent(value);
    const endpoint = `https://secure.geonames.org/searchJSON?q=${partialValue}&maxRows=40&username=Kacper29`;
  
    fetch(endpoint)
      .then((response) => response.json())
      .then((data) => {
        let results = [];
        if (searchType === 'city') {
          results = data.geonames.filter((entry) => entry.fcode && entry.fcode.startsWith('PPL') && entry.name.toLowerCase().includes(value.toLowerCase()));
        } else {
          results = data.geonames.filter((entry) => entry.fcode && entry.fcode.startsWith('PCLI') && entry.name.toLowerCase().includes(value.toLowerCase()));
        }
  
        setResults(results);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
      });
  };
  
  const handleInputChange = (value, stateSetter, searchType) => {
    stateSetter(value);
    fetchData(value, searchType);
  };

  

  return (
    <div className="bar">
      <div className="location">
        <p>Country</p>
        <input
          type="text"
          className="searchbar-input"
          placeholder="Choose a country"
          value={selectedCountry}
          onChange={(e) => handleInputChange(e.target.value, setSelectedCountry, 'country')}
        />
      </div>
      <div className="location1">
        <p>City</p>
        <input
          type="text"
          className="searchbar-input"
          placeholder="Choose a city"
          value={selectedCity}
          onChange={(e) => handleInputChange(e.target.value, setSelectedCity, 'city')}
        />
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
            { value: 'Hotel', label: 'Hotel' },
            { value: 'Apartment', label: 'Apartment' },
            { value: 'Guesthouse', label: 'Guesthouse' },
            { value: 'Villa', label: 'Villa' },
            { value: 'Resort', label: 'Resort' },
            { value: 'Hostel', label: 'Hostel' },
          ]}
          placeholder="Type of accommodation"
          isSearchable={true}
          styles={{
            control: (provided) => ({
              ...provided,
              border: 'none',
              boxShadow: 'none',
            }),
            indicatorSeparator: () => ({ display: 'none' }),
            dropdownIndicator: () => ({ display: 'none' }),
            placeholder: (provided) => ({
              ...provided,
              color: '#666',
            }),
          }}
        />
      </div>

      <button className="searchbar-button" type="button">
        <FaSearch
          style={{ marginRight: '2px', cursor: 'pointer' }}
          onClick={handleRefreshClick}
        />
      </button>
    </div>
  );
};
