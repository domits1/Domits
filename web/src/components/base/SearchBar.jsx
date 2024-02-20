import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { FaSearch } from 'react-icons/fa';
import Select from 'react-select';
import 'react-datepicker/dist/react-datepicker.css';
import debounce from 'lodash.debounce';
import './SearchBar.css';

export const SearchBar = ({ setResults }) => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [accommodation, setAccommodation] = useState('');

  // de brains achter de search, hier wordt de data gefilterd en verdeeld over twee delen: Country, city
  const fetchData = (value, searchType) => {
    const partialValue = encodeURIComponent(value);
    const endpoint = `http://api.geonames.org/searchJSON?q=${partialValue}&maxRows=40&username=Kacper29`;

    fetch(endpoint)
      .then((response) => response.json())
      .then((data) => {
        const countries = data.geonames.filter((entry) => entry.fcode.startsWith('PCLI'));
        const cities = data.geonames.filter((entry) => entry.fcode.startsWith('PPL'));

        let results = [];
        if (searchType === 'city') {
          results = cities.map((result) => ({ ...result, type: 'city' }));
        } else {
          results = countries.map((result) => ({ ...result, type: 'country' }));
        }

        setResults(results);
      });
  };

  const handleInputChange = (value, stateSetter, searchType) => {
    stateSetter(value);
    debouncedFetch(value, searchType);
  };

  const debouncedFetch = debounce((value, searchType) => {
    fetchData(value, searchType);
  }, 100); // debounce-tijd naar 100 milliseconden

  return (
    <div className="bar">
      <div className="location">
        <p>Country</p>
        <input
          type="text"
          placeholder="Choose a country"
          value={selectedCountry}
          onChange={(e) => handleInputChange(e.target.value, setSelectedCountry, 'country')}
        />
      </div>
      <div className="location1">
        <p>City</p>
        <input
          type="text"
          placeholder="Choose a city"
          value={selectedCity}
          onChange={(e) => handleInputChange(e.target.value, setSelectedCity, 'city')}
        />
      </div>
      <div className='check-in' onClick={() => document.getElementById('checkInPicker').click()}>
        <p>Check in</p>
        <div>
          <DatePicker
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
      { value: 'hotel', label: 'Hotel' },
      { value: 'apartment', label: 'Apartment' },
      { value: 'guesthouse', label: 'Guesthouse' },
      // Add more options as needed
    ]}
    placeholder="Type of accommodation"
    isSearchable={false}
    styles={{
      control: (provided) => ({
        ...provided,
        border: 'none',
        boxShadow: 'none',
        width: '200px', // Adjust the width as needed
      }),
      indicatorSeparator: (provided) => ({
        ...provided,
        display: 'none',
      }),
      dropdownIndicator: (provided) => ({
        ...provided,
        display: 'none',
      }),
      placeholder: (provided) => ({
        ...provided,
        color: '#666',
      }),
    }}
  />
</div>

      <button className="button" type="button">
        <FaSearch style={{ marginRight: '1px' }} />
      </button>
    </div>
  );
};
