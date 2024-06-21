import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '@hassanmojab/react-modern-calendar-datepicker/lib/DatePicker.css';
import DatePicker from '@hassanmojab/react-modern-calendar-datepicker';
import {
  FaTimes, FaSearchLocation, FaBuilding, FaHome, FaCaravan, FaHotel, FaDoorClosed,
  FaShip, FaTree, FaSpinner, FaTimesCircle, FaUmbrellaBeach, FaUser, FaChild, FaBaby, FaPaw, FaSearch,
} from 'react-icons/fa';
import ReactCountryFlag from "react-country-flag";
import PlacesAutocomplete, { geocodeByAddress, getLatLng } from 'react-places-autocomplete';
import Select from 'react-select';
import { countries } from 'country-data';
import './SearchBar.css';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const [rooms, setRooms] = useState(0);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [startDate, endDate] = dateRange;
  const [error, setError] = useState("");
  const [selectedDayRange, setSelectedDayRange] = useState({ from: null, to: null, });
  const [isMobile, setIsMobile] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);

  const hasTwoGuests = (adults + children > 0) && (infants + pets === 0);


  const navigate = useNavigate();
  const location = useLocation();


  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 730);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleSearchBar = () => {
    setShowSearchBar(!showSearchBar);
  };

  const totalGuestsDescription = useMemo(() => {
    const parts = [];
    if (adults > 0) parts.push(`${adults} Adult${adults > 1 ? 's' : ''}`);
    if (children > 0) parts.push(`${children} Child${children > 1 ? 'ren' : ''}`);
    if (infants > 0) parts.push(`${infants} Infant${infants > 1 ? 's' : ''}`);
    if (pets > 0) parts.push(`${pets} Pet${pets > 1 ? 's' : ''}`);
    if (rooms > 0) parts.push(`${rooms} Room${rooms > 1 ? 's' : ''}`);
    return parts.join(', ');
  }, [adults, children, infants, pets, rooms]);

  const guestDropdownRef = useRef();
  const resetGuests = useCallback((e) => {
    e.stopPropagation();
    setAdults(0);
    setChildren(0);
    setInfants(0);
    setPets(0);
    setRooms(0);
  }, []);

  const toggleGuestDropdown = useCallback((e) => {
    e.stopPropagation();
    setShowGuestDropdown(prevState => !prevState);
  }, []);

  const closeGuestDropdown = (e) => {
    e.stopPropagation();
    setShowGuestDropdown(false);
  };

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


  const handleSelect = async (selectedAddress) => {
    if (!selectedAddress || !selectedAddress.description) {
      return;
    }

    const parts = selectedAddress.description.split(', ');
    let city, country;

    if (parts.length > 1) {
      city = parts[0];
      country = parts[parts.length - 1].trim();
    } else {
      country = parts[0];
    }

    setAddress(`${city ? city + ', ' : ''}${country}`);
    setShowResults(true);

    try {
      const results = await geocodeByAddress(selectedAddress.description);
      const latLng = await getLatLng(results[0]);
    } catch (error) {
    }
  };
  const handleClear = (event) => {
    event.preventDefault();
    setAddress('');
    setIsFocused(false);
  };

  useEffect(() => {
    handleSearchWithDelay(false);
  }, [accommodation, address, totalGuests]);

  useEffect(() => {
    if (location.state && location.state.searchResults) {
      setSearchResults(location.state.searchResults);
    }
  }, [location]);

  const handleSearchWithDelay = async (shouldNavigate) => {
    setLoading(true);
    setError("");

    const queryParams = [
      accommodation ? `type=${accommodation}` : null,
      address ? `searchTerm=${address}` : null,
      totalGuests > 0 ? `guests=${totalGuests}` : null,
    ].filter(Boolean).join('&');

    const apiUrl = `https://dviy5mxbjj.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodationTypes?${queryParams}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {  
        if (response.status === 404) {
          setError("No results have been found...");
        } else {
          setError("Er is een fout opgetreden bij het ophalen van de gegevens.");
        }
        return;
      }
      const data = await response.json();
      if (data.length === 0) {
        setTimeout(() => {
          setError("No results have been found...");
        }, 500);
      } else {
        if (shouldNavigate) {
          navigate('/', { state: { searchResults: data } });
        } else {
          setSearchResults(data);
        }
      }
    } catch (error) {
      setError("Er is een fout opgetreden bij het ophalen van de gegevens.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const shouldNavigate = location.pathname !== '/';
    if (shouldNavigate) {
      setSearchResults([]);
    }
    handleSearchWithDelay(shouldNavigate);
    setTimeout(() => {
      handleSearchWithDelay(shouldNavigate);
    }, 1000);
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
  // calendar gedeelte
  useEffect(() => {
    if (selectedDayRange.from && selectedDayRange.to) {
      const start = new Date(
        selectedDayRange.from.year,
        selectedDayRange.from.month - 1,
        selectedDayRange.from.day
      );
      const end = new Date(
        selectedDayRange.to.year,
        selectedDayRange.to.month - 1,
        selectedDayRange.to.day
      );
      setDateRange([start, end]);
      setCheckIn(start);
      setCheckOut(end);
    } else {
      setDateRange([null, null]);
      setCheckIn(null);
      setCheckOut(null);
    }
  }, [selectedDayRange]);

  //voor de date format
  function formatDateToEnglish(date) {
    const options = { day: 'numeric', month: 'short' };
    return date.toLocaleDateString('en-US', options);
  }

  const handleClick = () => {
    setError(null);
  };

  const incrementGuests = (guestType, setGuestType) => {
    setGuestType(prev => prev < 13 ? prev + 1 : prev);
    if (adults === 0) {
      setAdults(1);
    }
  };

  return (
    <>
      {error && (
        <div className="error-message" onClick={handleClick}>{error} <FaTimesCircle /></div>)}
      <div className="bar-container">
        {isMobile && (
          <button className="mobile-search-button" onClick={toggleSearchBar}>
          <FaSearch size={15} /> Search • Filter Accommodations
          
        </button>
        )}
  
        {(showSearchBar || !isMobile) && (
          <div className="bar">
            <div className="location">
          <PlacesAutocomplete
            value={address}
            onChange={handleChange}
            onSelect={handleSelect}
            searchOptions={{
              types: ['locality', 'country'],
              language: 'en',
            }}
          >
            {({ getInputProps, suggestions, getSuggestionItemProps, loading }) => (
              <div className="autocomplete-container" style={{ marginTop: '10px', position: 'relative' }}>
                <input
                  {...getInputProps({
                    className: 'searchBar',
                    onFocus: handleFocus,
                    onBlur: handleBlur,
                    placeholder: 'Search Destination'
                  })}
                />
                {address && isFocused && (
                  <button
                    className="ClearButton"
                    onMouseDown={handleClear}
                    style={{
                      position: 'absolute',
                      right: '5px',
                      top: '50%',
                      transform: isMobile ? 'translateY(-80%)' : 'translateY(-30%)',
                      border: 'none',
                      fontSize: isMobile ? '1.1rem' : '0.9rem',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <FaTimes />
                  </button>
                )}
                {suggestions.length > 0 && (
                  <div
                    className="suggestions-container"
                    style={{
                      position: 'absolute',
                      top: isMobile ? '85%' : '150%',
                      left: isMobile ? -8 : -30,
                      width: isMobile ? '100%' : '135%',
                      backgroundColor: 'white',
                      borderRadius: '15px',
                      padding: isMobile ? '0.5rem' : '1rem',
                      boxShadow: '0 6px 6px rgba(0, 0, 0, 0.15)'
                    }}
                  >
                    {loading && <div>Loading <FaSpinner /></div>}
                    {suggestions.map((suggestion, index) => {
                      const parts = suggestion.description.split(', ');
                      const city = parts[0];
                      const country = parts[parts.length - 1].trim();
                      const countryCode = getCountryCode(country);

                      return (
                        <div
                          key={index}
                          {...getSuggestionItemProps(suggestion, {
                            style: {
                              backgroundColor: suggestion.active ? '#f0f0f0' : '#fff',
                              padding: isMobile ? '1px 0px' : '20px 10px',
                              cursor: 'pointer',
                              transition: 'background-color 0.2s ease, transform 0.2s ease, border-radius 0.2s ease',
                              fontSize: '1rem',
                              color: '#000',
                              borderBottom: '1px solid #ddd',
                              margin: '0',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              justifyContent: 'flex-start',
                              transform: suggestion.active ? 'scale(1.04)' : 'none',
                              zIndex: suggestion.active ? '1' : '0',
                            },
                            onMouseEnter: (e) => (e.target.style.borderRadius = '12px'),
                            onMouseLeave: (e) => (e.target.style.borderRadius = '0px'),
                            onClick: () => handleSelect(suggestion)
                          })}
                        >
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <ReactCountryFlag
                              countryCode={countryCode}
                              svg
                              style={{
                                marginRight: '10px',
                                width: '20px',
                                height: '15px',
                                boxShadow: '2px 2px 10px #777',
                                marginBottom: '-0.8rem'
                              }}
                              title={country}
                            />
                            <span>{city}</span>
                          </div>
                          <div style={{ marginLeft: '30px', fontSize: '0.8rem', color: '#666' }}>
                            {country}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </PlacesAutocomplete>
        </div>

        <div className="searchInputContainer">
          <Select
            value={accommodation ? { label: accommodation, value: accommodation } : null}
            onChange={(selectedOption) => setAccommodation(selectedOption ? selectedOption.value : '')}
            options={[
              { value: 'Apartment', label: <><FaBuilding /> Apartment</> },
              { value: 'House', label: <><FaHome /> House</> },
              { value: 'Villa', label: <><FaUmbrellaBeach /> Villa</> },
              { value: 'Boat', label: <><FaShip /> Boat</> },
              { value: 'Camper', label: <><FaCaravan /> Camper</> },
              { value: 'Cottage', label: <><FaTree /> Cottage</> },
              { value: 'Hotel', label: <><FaHotel /> Hotel</> },
            ]}
            isSearchable={false}
            isClearable={true}
            placeholder={<span className="searchTitle">Accommodation</span>}
            styles={{
              control: (provided) => {
                const isMobile = window.innerWidth <= 730;
                return {
                  ...provided,
                  width: '100%',
                  border: 'none',
                  height: '2.7rem',
                  transform: isMobile ? 'translateX(-28px)' : 'translateY(2px)',
                  boxShadow: 'none',
                  background: 'none',
                  padding: '0',
                  margin: 'auto',
                  cursor: 'pointer',
                  width: isMobile ? '140%' : '150px',
                };
              },
              menu: (provided, state) => {
                const isMobile = window.innerWidth <= 730; 
                return {
                  ...provided,
                  backgroundColor: 'white',
                  borderRadius: '10px',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.15)',
                  marginTop: isMobile ? '-7.1rem' : '1rem', 
                  width: isMobile ? 'calc(95vw - 40px)' : '15rem', 
                  overflowX: 'hidden',
                  overflowY: 'auto',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
                  zIndex: 9999,
                  left: '50%',
                  transform: 'translateX(-50%)', 
                  position: 'absolute',
                };
              },
              indicatorSeparator: () => ({ display: 'none' }),
              dropdownIndicator: () => ({ display: 'none' }),
              option: (provided, state) => ({
                ...provided,
                backgroundColor: state.isSelected ? '#f0f0f0' : state.isFocused ? '#e6e6e6' : 'white',
                color: state.isFocused ? 'black' : '#666',
                fontWeight: state.isFocused ? '800' : 'normal',
                fontSize: '14px',
                padding: '13.8px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isMobile ? 'center' : 'flex-start', 
                borderRadius: '10px',
                gap: '15px',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                '&:hover': {
                  color: 'black',
                  backgroundColor: '#e6e6e6',
                  transform: 'scale(1)',
                },
              }),
              clearIndicator: (provided) => ({
                ...provided,
                color: 'black',
                position: 'relative',
                transform: 'translateY(0%)',
                fontSize: '2rem',
              }),

              singleValue: (provided) => ({
                ...provided,
                textAlign: 'center',
                fontWeight: 500,
                color: '#000',
                fontSize: '1rem',
              }),
            }}
          />

        </div>

        <div className={`button-section ${showGuestDropdown ? 'active' : ''}`} onClick={toggleGuestDropdown}>
          <p className={`searchTitleGuest ${totalGuests > 0 ? 'hidden' : ''}`}>Guests • Rooms</p>
          {totalGuests > 0 && (
            <button
              className="clear-guests"
              onClick={resetGuests}
              style={{
                position: 'absolute',
                right: '0.2rem',
                top: '50%',
                transform: 'translateY(-35%)',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontSize: isMobile ? '1.1rem':  '0.9rem',
              }}
            >
              <FaTimes />
            </button>
          )}

          <p className={`guestP ${hasTwoGuests ? 'nowrap' : ''}`}>
            {totalGuestsDescription}
          </p>
          <div className={`guest-dropdown ${showGuestDropdown ? 'active' : ''}`} ref={guestDropdownRef} onClick={(e) => e.stopPropagation()}>
            {isMobile && (
              <button
                className="close-guest-dropdown"
                onClick={closeGuestDropdown}
                style={{
                  position: 'absolute',
                  padding: '0.3rem',
                  right: '10px',
                  top: '10px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                }}
              >
                <FaTimes />
              </button>
            )}

            <GuestCounter
              label={<><FaUser /> Adults</>}
              description="Ages 16 or above"
              value={adults}
              onIncrement={() => setAdults(adults < 13 ? adults + 1 : adults)}
              onDecrement={() => setAdults(adults > 0 ? adults - 1 : adults)}
            />
            <GuestCounter
              label={<><FaChild /> Children</>}
              description="Ages 2–16"
              value={children}
              onIncrement={() => incrementGuests(children, setChildren)}
              onDecrement={() => setChildren(children > 0 ? children - 1 : children)}
            />
            <GuestCounter
              label={<><FaBaby /> Infants</>}
              description="Ages 0–2"
              value={infants}
              onIncrement={() => incrementGuests(infants, setInfants)}
              onDecrement={() => setInfants(infants > 0 ? infants - 1 : infants)}
            />
            <GuestCounter
              label={<><FaPaw /> Pets</>}
              description="Normal sized pets"
              value={pets}
              onIncrement={() => incrementGuests(pets, setPets)}
              onDecrement={() => setPets(pets > 0 ? pets - 1 : pets)}
            />
            <GuestCounter
              label={<><FaDoorClosed /> Rooms</>}
              description="Amount of rooms in the Accommodation"
              value={rooms}
              onIncrement={() => incrementGuests(rooms, setRooms)}
              onDecrement={() => setRooms(rooms > 0 ? rooms - 1 : rooms)}
            />
          </div>
        </div>


        <div className="check-in" style={{ position: 'relative' }}>
          <input
            className="input-calendar"
            type="text"
            value={startDate && endDate
              ? `${formatDateToEnglish(startDate)} - ${formatDateToEnglish(endDate)}`
              : ''}
            readOnly={true}
            style={{ fontSize: '0.85rem' }}
          />
          {!startDate && !endDate && (
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -40%)',
                color: '#0D9813',
                fontWeight: 500,
                fontSize: '1rem',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',

              }}
            >
              Check in • out
            </span>
          )}
          <DatePicker
            label="Basic date picker"
            value={selectedDayRange}
            calendarClassName="responsive-calendar"
            format="MMM DD, YYYY"
            onChange={(range) => {
              setSelectedDayRange(range);
            }}
            shouldHighlightWeekends
            style={{ transform: 'translateX(-20px)' }}
          // renderFooter={() => (
          //   <div style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem 0' }}>
          //     <button
          //       type="button"
          //       onClick={() => {
          //         setSelectedDayRange({ from: null, to: null });
          //       }}
          //       style={{
          //         background: 'rgb(250, 50, 50)',
          //         border: 'none',
          //         color: '#fff',
          //         borderRadius: '0.5rem',
          //         padding: '0.8rem 2.4rem',
          //         cursor: 'pointer',
          //       }}
          //     >
          //       Reset Dates
          //     </button>
          //   </div>
          // )}
          />
        </div>

        <button className={`searchbar-button `} type="button" onClick={handleSearch}>
          <FaSearchLocation size={15} style={{ position: 'relative', right: '2px' }} className="search-icon" />
          <span className="search-text">Search</span>
        </button>

        </div>
      )}
    </div>
  </>
);}