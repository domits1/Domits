import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import debounce from 'lodash.debounce';
import './SearchBar.css';

export const SearchBar = ({ setResults }) => {
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [accommodation, setAccommodation] = useState('');

//de brains achter de search, hier wordt de data gefilterd en verdeeld over twee delen: Country, city
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
      })

  };

  const handleInputChange = (value, stateSetter, searchType) => {
    stateSetter(value);
    debouncedFetch(value, searchType);
  };
  
  const debouncedFetch = debounce((value, searchType) => {
    fetchData(value, searchType);
  }, 100); //debounce-tijd naar 100 milliseconden

  return (
    <div className='bar'>
      <div className='location'>
        <p>Country</p>
        <input
          type='text'
          placeholder='Choose a country'
          value={selectedCountry}
          onChange={(e) => handleInputChange(e.target.value, setSelectedCountry, 'country')}
        />
      </div>

      <div className='location1'>
        <p>City</p>
        <input
          type='text'
          placeholder='Choose a city'
          value={selectedCity}
          onChange={(e) => handleInputChange(e.target.value, setSelectedCity, 'city')}
        />
      </div>

      <div className='check-in'>
        <p>Check in</p>
        <input
          type='text'
          placeholder='Start date'
          value={checkIn}
          
        />
      </div>

      <div className='check-out'>
        <p>Check out</p>
        <input
          type='text'
          placeholder='End date'
          value={checkOut}
          
        />
      </div>

      <div className='accommodation'>
        <p>Accommodation</p>
        <input
          type='text'
          placeholder='Type of accommodation'
          value={accommodation}
         
        />
      </div>

      <button className='button' type="button">
    <FaSearch style={{ marginRight: '1px' }} />
</button>


    </div>
  );
};
