import React, { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import { 
  FaTimes, 
  FaSearchLocation, 
  FaMapPin, 
  FaSpinner,
  FaBuilding,
  FaHome,        
  FaCaravan,     
  FaHotel,
  FaShip,      
} from 'react-icons/fa';import ReactCountryFlag from "react-country-flag";
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import Select from 'react-select';
import { countries } from 'country-data';
import 'react-datepicker/dist/react-datepicker.css';
import './SearchBar.css';

const handleButtonClick = (e) => {
  e.stopPropagation();
};

const GuestCounter = ({ label, value, onIncrement, onDecrement, description }) => (
  <div className="guestCounter" onClick={handleButtonClick}>
    <div>
      <p className="guestLabel">{label}</p>
      <p className="guestDescription">{description}</p>
    </div>
    <div className="controls">
      <button onClick={(e) => { handleButtonClick(e); onDecrement(); }} disabled={value <= 0}>-</button>
      <span>{value}</span>
      <button onClick={(e) => { handleButtonClick(e); onIncrement(); }}>+</button>
    </div>
  </div>
);

export const SearchBar = ({ setSearchResults }) => {
  const [checkIn, setCheckIn] = useState(null);
  const [guests, setGuests] = useState(1);
  const [accommodation, setAccommodation] = useState('');
  const [address, setAddress] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [infants,setInfants] = useState(0);

  const [pets, setPets] = useState(0);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);

  const guestDropdownRef = useRef();

  const toggleGuestDropdown = (e) => {
    e.stopPropagation();
    setShowGuestDropdown(prevState => !prevState);
  };

  // Attach or detach the event listener based on the state of showGuestDropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!guestDropdownRef.current.contains(e.target)) {
        setShowGuestDropdown(false);
      }
    };

    if (showGuestDropdown) {
      document.addEventListener('mousedown', handleOutsideClick);
    } else {
      document.removeEventListener('mousedown', handleOutsideClick);
    }

    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showGuestDropdown]);

  const handleChange = (address) => {
    setAddress(address);
  };

  const handleSelect = async (address) => {
    setAddress(address);
    try {
      const results = await geocodeByAddress(address);
      const latLng = await getLatLng(results[0]);
      setShowResults(true);
    } catch (error) {
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
      setSearchResults(data); // Dit stuurt de data naar de App component
    } catch (error) {
    }
  };

  //dit is een tijdelijke oplossing voor dat bij sommige landen geen vlaggen te zie zijn
  const getCountryCode = (countryName) => {
    const knownAbbreviations = {
      'USA': 'US',
      'RUSSIA': 'RU',
      'UK': 'GB',
      'PALESTINE': 'PS',
      'NORTH KOREA': 'KP',
      'TANZANIA': 'TZ',
      'UAE': 'AE',
      'VIETNAM': 'VN',
      'VATICAN CITY': 'VA',
      'VENEZUELA': 'VE',

      //hier kan je landen toevoegen waarvan vlaggen missen

    };

    let country = countries.all.find((c) => c.name.toUpperCase() === countryName.toUpperCase());
    if (!country) {
      country = knownAbbreviations[countryName.toUpperCase()];
    }
    if (typeof country === 'string') {
      return country;
    }
    if (!country) {
      country = countries.all.find((c) => c.name.toUpperCase() === countryName.toUpperCase().replace(/^THE\s+/, ''));
    }

    return country ? country.alpha2 : "";
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
                  <FaTimes className='faTimesIcon' />
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
                {loading && <div> <FaSpinner /></div>}
                {suggestions.map((suggestion) => {
                  if (suggestion.types.includes('locality') || suggestion.types.includes('country')) {
                    const parts = suggestion.description.split(', ');
                    const countryName = parts[parts.length - 1].trim();
                    const countryCode = getCountryCode(countryName);
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
                        <ReactCountryFlag
                          countryCode={countryCode}
                          svg
                          style={{
                            marginRight: '10px',
                            width: '20px',
                            height: '15px',
                            boxShadow: '0px 0px 5px #777',
                            marginTop: '3px'
                          }}
                          title={countryName}
                        />
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

      <div className="accommodation searchInputContainer">
        <p className="searchTitleCenterAcco searchTitleAccommodation">Accommodation</p>

        <Select
          value={accommodation ? { label: accommodation, value: accommodation } : null}
          onChange={(selectedOption) => setAccommodation(selectedOption ? selectedOption.value : '')}
          options={[
            { value: 'Apartment', label: <><FaBuilding /> Apartment</> },
            { value: 'House', label: <><FaHome /> House</> },
            { value: 'Villa', label: <><FaHotel /> Villa</> },
            { value: 'Boathouse', label: <><FaShip /> Boathouse</> },
            { value: 'Camper', label: <><FaCaravan /> Camper</> },
          ]}
          placeholder="Type of Accommodation"
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
              position: 'relative',
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
              backgroundColor: state.isSelected ? '#ffff' : state.isFocused ? '#d0d0d0' : provided.backgroundColor,
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
              color: 'black',
              position: 'absolute',
              right: '-8px',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
            }),
            singleValue: (provided) => ({
              ...provided,
              textAlign: 'left', 
              fontSize: '13px',
            }),
            placeholder: (provided) => ({
              ...provided,
              textAlign: 'left', 
            }),
          }}
        />
      </div>

      <div className='check-in' onClick={() => document.getElementById('checkInPicker').click()} style={{ cursor: 'pointer' }}>
        <p className="searchTitleCenter">Check in/out</p>
        <div className="searchInputContainer" style={{ marginTop: '10px' }}>
          <DatePicker
            className="searchbar-input"
            id="checkInPicker"
            selected={checkIn}
            onChange={(date) => setCheckIn(date)}
            placeholderText="Start-End date"
            dateFormat="dd/MM/yyyy"
          />
        </div>
      </div>

      <div className={`button-section ${showGuestDropdown ? 'active' : ''}`} onClick={toggleGuestDropdown}>
        <p className="searchTitleGuest ">Guests</p>
        <p className='guestP'>Add guests</p>
        {showGuestDropdown && (
          <div className="guest-dropdown" ref={guestDropdownRef} onClick={(e) => e.stopPropagation()}>
            <GuestCounter
              label="Adults"
              description="Ages 16 or above"
              value={adults}
              onIncrement={() => setAdults(adults + 1)}
              onDecrement={() => setAdults(adults - 1)}
            />

            <GuestCounter
              label="Children"
              description="Ages 4–16"
              value={children}
              onIncrement={() => setChildren(children + 1)}
              onDecrement={() => setChildren(children - 1)}
            />

            <GuestCounter
              label="Infants"
              description="Ages 0–4"
              value={infants}
              onIncrement={() => setInfants(infants + 1)}
              onDecrement={() => setInfants(infants - 1)}
            />

            <GuestCounter
              label="Pets"
              description="Normal sized pets"
              value={pets}
              onIncrement={() => setPets(pets + 1)}
              onDecrement={() => setPets(pets - 1)}
            />
          </div>
        )}
      </div>



      <button className="searchbar-button" type="button" onClick={handleSearch}>
        <FaSearchLocation size={16} style={{ position: 'relative', top: '-2px' }} />
      </button>
    </div>
  );
};