import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import { FaTimes, FaSearchLocation, FaSpinner, FaBuilding, FaHome, FaCaravan, FaHotel, FaShip, FaTree } from 'react-icons/fa';
import ReactCountryFlag from "react-country-flag";
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import Select from 'react-select';
import { countries } from 'country-data';
import 'react-datepicker/dist/react-datepicker.css';
import './SearchBar.css';

const handleButtonClick = (e) => {
  e.stopPropagation();
};


const GuestCounter = React.memo(({ label, value, onIncrement, onDecrement, description }) => {
  return (
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
});

export const SearchBar = ({ setSearchResults, setLoading }) => {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [dateRange, setDateRange] = useState([null, null]);
  const [accommodation, setAccommodation] = useState('');
  const [address, setAddress] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [startDate, endDate] = dateRange;
  const [error, setError] = useState("");


  const totalGuestsDescription = useMemo(() => {
    const parts = [];
    if (adults > 0) parts.push(`${adults} Adult${adults > 1 ? 's' : ''}`);
    if (children > 0) parts.push(`${children} Child${children > 1 ? 'ren' : ''}`);
    if (infants > 0) parts.push(`${infants} Infant${infants > 1 ? 's' : ''}`);
    if (pets > 0) parts.push(`${pets} Pet${pets > 1 ? 's' : ''}`);
    return parts.join(', ');
  }, [adults, children, infants, pets]);

  const guestDropdownRef = useRef();
  const resetGuests = useCallback((e) => {
    e.stopPropagation();
    setAdults(0);
    setChildren(0);
    setInfants(0);
    setPets(0);
  }, []);

  const resetDates = (e) => {
    e.stopPropagation();
    setDateRange([null, null]);
    setCheckIn(null);
    setCheckOut(null);
  };

  const toggleGuestDropdown = useCallback((e) => {
    e.stopPropagation();
    setShowGuestDropdown(prevState => !prevState);
  }, []);

  const totalGuests = adults + children + infants + pets;

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

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleBlur = () => {
    setIsFocused(false);
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

  const handleClear = (event) => {
    event.preventDefault();
    setAddress('');
    setIsFocused(false);
  };

  // Verbinding met API Gateway
  const handleSearch = async () => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    if (accommodation) params.append('type', accommodation);
    if (address) params.append('searchTerm', address);
    const url = `https://dviy5mxbjj.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodationTypes?${params}`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.length === 0) {
        setError("Geen resultaten gevonden.");
      } else {
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Error during fetch:', error);
      setError("Er is een fout opgetreden bij het ophalen van de gegevens.");
    } finally {
      setLoading(false);
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
      {error && <div className="error-message">{error}</div>}
      <div className="location">
        <p className="searchTitle">Location</p>

        <PlacesAutocomplete value={address} onChange={handleChange} onSelect={handleSelect} searchOptions={{ language: 'en' }}>
          {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
            <div className="autocomplete-container searchInputContainer" style={{ marginTop: '10px', position: 'relative' }}>
              <input
                {...getInputProps({
                  placeholder: 'Search Places ....',
                  className: 'searchBar',
                  onFocus: handleFocus,
                  onBlur: handleBlur,
                })}
              />
              {address && isFocused && (
                <button
                  onMouseDown={handleClear}
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
                  marginLeft: '15%',
                }}
              >
                {loading && <div> <FaSpinner /></div>}
                {suggestions.map((suggestion, index) => {
                  if (suggestion.types.includes('locality') || suggestion.types.includes('country')) {
                    const parts = suggestion.description.split(', ');
                    const countryName = parts[parts.length - 1].trim();
                    const countryCode = getCountryCode(countryName);
                    const filteredDescription = parts.length > 1 ? `${parts[0]}, ${parts[parts.length - 1]}` : parts[0];

                    return (
                      <div
                        key={index}
                        {...getSuggestionItemProps(suggestion, {
                          style: {
                            backgroundColor: suggestion.active ? '#f0f0f0' : '#fff',
                            padding: '18px 10px',
                            borderBottom: '3px solid #ddd',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s ease, transform 0.2s ease',
                            fontSize: '15px',
                            color: '#000',
                            borderRadius: '5px',
                            margin: '0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            width: '300px',
                            transform: suggestion.active ? 'scale(1.02)' : 'none',
                            zIndex: suggestion.active ? '1' : '0',
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
            { value: 'Boat', label: <><FaShip /> Boat</> },
            { value: 'Camper', label: <><FaCaravan /> Camper</> },
            { value: 'Cottage', label: <><FaTree /> Cottage</> },
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
              backgroundColor: state.isSelected ? '#f0f0f0' : state.isFocused ? '#e6e6e6' : 'white',
              color: state.isFocused ? 'black' : '#666',
              fontWeight: state.isFocused ? '600' : 'normal',
              fontSize: '14px',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: '15px',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              '&:hover': {
                color: 'black',
                backgroundColor: '#e6e6e6',
                transform: 'scale(1.04)'
              },
              whiteSpace: 'nowrap',
              overflow: 'hidden',
            }),
            menu: (provided) => ({
              ...provided,
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
              marginTop: '20px',
              width: '220px',
              overflowX: 'hidden',
              overflowY: 'auto',
            }),
            clearIndicator: (provided) => ({
              ...provided,
              color: 'black',
              position: 'absolute',
              right: '0px',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
            }),
            singleValue: (provided) => ({
              ...provided,
              color: '#333',
              fontSize: '14px',
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
            placeholderText="Start-End date"
            showYearDropdown={false}
            showMonthDropdown={true}
            dateFormat="d MMM"
            selectsRange={true}
            startDate={startDate}
            endDate={endDate}
            onChange={update => setDateRange(update)}
            readOnly={false}
          />
          {startDate && endDate && (
            <button onClick={resetDates} className="date-reset-button">
              <FaTimes />
            </button>
          )}
        </div>
      </div>

      <div className={`button-section ${showGuestDropdown ? 'active' : ''}`} onClick={toggleGuestDropdown}>
        <p className="searchTitleGuest">Guests</p>
        {totalGuests > 0 && (
          <button
            className="clear-guests"
            onClick={resetGuests}
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
            <FaTimes />
          </button>
        )}
        <p className='guestP'>{totalGuestsDescription || 'Add guests'}</p>
        {showGuestDropdown && (
          <div className="guest-dropdown" ref={guestDropdownRef} onClick={(e) => e.stopPropagation()}>
            <GuestCounter
              label="Adults"
              description="Ages 16 or above"
              value={adults}
              onIncrement={() => setAdults(adults < 13 ? adults + 1 : adults)}
              onDecrement={() => setAdults(adults > 0 ? adults - 1 : adults)}
            />
            <GuestCounter
              label="Children"
              description="Ages 2–16"
              value={children}
              onIncrement={() => setChildren(children < 13 ? children + 1 : children)}
              onDecrement={() => setChildren(children > 0 ? children - 1 : children)}
            />
            <GuestCounter
              label="Infants"
              description="Ages 0–2"
              value={infants}
              onIncrement={() => setInfants(infants < 13 ? infants + 1 : infants)}
              onDecrement={() => setInfants(infants > 0 ? infants - 1 : infants)}
            />
            <GuestCounter
              label="Pets"
              description="Normal sized pets"
              value={pets}
              onIncrement={() => setPets(pets < 13 ? pets + 1 : pets)}
              onDecrement={() => setPets(pets > 0 ? pets - 1 : pets)}
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