// For explenation on how search works: https://github.com/domits1/Domits/wiki/Web-Search
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '@hassanmojab/react-modern-calendar-datepicker/lib/DatePicker.css';
import DatePicker, { utils } from '@hassanmojab/react-modern-calendar-datepicker';
import {
  FaTimes, FaSearchLocation, FaHome, FaCaravan,FaDoorClosed,
  FaShip, FaTimesCircle, FaUser, FaChild, FaBaby, FaPaw,
} from 'react-icons/fa';
import Select from 'react-select';
import './SearchBar.css';
import { useNavigate, useLocation } from 'react-router-dom';

export const SearchBar = ({ setSearchResults, setLoading, toggleBar}) => {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [dateRange, setDateRange] = useState([null, null]);
  const [accommodation, setAccommodation] = useState('');
  const [address, setAddress] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [adults, setAdults] = useState(0);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pets, setPets] = useState(0);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [startDate, endDate] = dateRange;
  const [error, setError] = useState("");
  const [selectedDayRange, setSelectedDayRange] = useState({ from: null, to: null, });
  const [isMobile, setIsMobile] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [isBarActive, setIsBarActive] = useState(false);
  const hasTwoGuests = (adults + children > 0) && (infants + pets === 0);

  const handleButtonClick = (e) => {
    e.stopPropagation();
  };

  const GuestCounter = React.memo(({ label, value, onIncrement, onDecrement, description }) => {
    return (
      <div className="Search-guestCounter" onClick={handleButtonClick}>
        <div>
          <p className="Search-guestLabel">{label}</p>
          <p className="Search-guestDescription">{description}</p>
        </div>
        <div className="Search-controls">
          <button onClick={(e) => { handleButtonClick(e); onDecrement(); }} disabled={value <= 0}>-</button>
          <span>{value}</span>
          <button onClick={(e) => { handleButtonClick(e); onIncrement(); }}>+</button>
        </div>
      </div>
    );
  });

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    handleResize();
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleSearchBar = () => {
    setShowSearchBar(!showSearchBar);
    setIsBarActive(!isBarActive);
    toggleBar(!isBarActive);
};

  const totalGuestsDescription = useMemo(() => {
    const parts = [];
    if (adults > 0) parts.push(`${adults} Adult${adults > 1 ? 's' : ''}`);
    if (children > 0) parts.push(`${children} Child${children > 1 ? 'ren' : ''}`);
    if (infants > 0) parts.push(`${infants} Infant${infants > 1 ? 's' : ''}`);
    if (pets > 0) parts.push(`${pets} Pet${pets > 1 ? 's' : ''}`);
    return parts.join(', ');
  }, [adults, children, infants, pets,]);

  const guestDropdownRef = useRef();
  const resetGuests = useCallback((e) => {
    e.stopPropagation();
    setAdults(0);
    setChildren(0);
    setInfants(0);
    setPets(0);
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

  const handleChange = (e) => {
    setAddress(e.target.value);
  };

  const incrementGuests = (guestType, setGuestType) => {
    setGuestType(prev => prev < 13 ? prev + 1 : prev);
    if (adults === 0) {
      setAdults(1);
    }
  };

  useEffect(() => {
    if (location.state && location.state.searchResults) {
      setSearchResults(location.state.searchResults);
    } 
    else if (
      (location.pathname === '/' || location.pathname === '/home') &&
      location.state &&
      location.state.searchParams
    ) {
      const { accommodation, address, totalGuests } = location.state.searchParams;
      setTimeout(() => {
        performSearch(accommodation, address, totalGuests);
      }, 1);
    } 
  }, [location]);

  const performSearch = async (accommodation, address, totalGuests) => {
    setLoading(true);
    setError('');

    const queryParams = new URLSearchParams();

    if (accommodation) {
      queryParams.append('type', accommodation);
    }

    if (address) {
      queryParams.append('searchTerm', address);
    }

    if (totalGuests > 0) {
      queryParams.append('guests', totalGuests);
    }

    const apiUrl = `https://dviy5mxbjj.execute-api.eu-north-1.amazonaws.com/dev/GetAccommodationTypes?${queryParams.toString()}`;

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        if (response.status === 404) {
          setError('No results have been found...');
        } else {
          setError('Er is een fout opgetreden bij het ophalen van de gegevens.');
        }
        return;
      }
      const data = await response.json();
      if (data.length === 0) {
        setTimeout(() => {
          setError('No results have been found...');
        }, 500);
      } else {
        setSearchResults(data);
      }
    } catch (error) {
      setError('Er is een fout opgetreden bij het ophalen van de gegevens.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const shouldNavigate = location.pathname !== '/home';
    if (shouldNavigate) {
      setSearchResults([]);
      navigate('/home', {
        state: {
          searchParams: { accommodation, address, totalGuests }
        }
      });
    } else {
      performSearch(accommodation, address, totalGuests);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };


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

  //voor de date format in calendar
  function formatDateToEnglish(date) {
    const options = { day: 'numeric', month: 'short' };
    return date.toLocaleDateString('en-US', options);
  }

  const handleClick = () => {
    setError(null);
  };

  return (
    <>
      {error && (
        <div className="Search-error-message" onClick={handleClick}>{error} <FaTimesCircle /></div>)}
      <div className="bar-container">
        {isMobile && (
          <button className="mobile-search-button" onClick={toggleSearchBar}>
            <FaSearchLocation size={15} /> Search & Filter Accommodations

          </button>
        )}

        {(showSearchBar || !isMobile) && (
            <div className={`SearchBarContainer ${isBarActive ? 'active' : 'inactive'}`}>
              <div className="Search-bar">
                <div className="Search-location">
                  <input
                    type="search"
                    placeholder="Search Destination"
                    value={address}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className="search-places-input"
                  />
                </div>

                <div className="searchInputContainer">
                  <Select
                      value={accommodation ? {label: accommodation, value: accommodation} : null}
                      onChange={(selectedOption) => setAccommodation(selectedOption ? selectedOption.value : '')}
                      options={[
                        {value: 'House', label: <><FaHome/> House</>},
                        {value: 'Boat', label: <><FaShip/> Boat</>},
                        {value: 'Camper', label: <><FaCaravan/> Camper</>},
                      ]}
                      isSearchable={false}
                      isClearable={true}
                      placeholder={<span className="searchTitle">Accommodation</span>}
                      styles={{
                        control: (provided) => {
                          const isMobile = window.innerWidth <= 768;
                          return {
                            ...provided,
                            border: 'none',
                            height: '2.7rem',
                            transform: isMobile ? 'translateX(-0px)' : 'translateY(7px)',
                            boxShadow: 'none',
                            background: 'none',
                            padding: '0',
                            margin: 'auto',
                            cursor: 'pointer',
                            width: isMobile ? '100%' : '8.7rem',
                          };
                        },
                        menu: (provided, state) => {
                          const isMobile = window.innerWidth <= 768;
                          return {
                            ...provided,
                            backgroundColor: 'white',
                            borderRadius: '10px',
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.4)',
                            marginTop: isMobile ? '-7.36rem' : '1rem',
                            width: isMobile ? 'calc(95vw - 40px)' : '15rem',
                            overflowX: 'hidden',
                            overflowY: 'auto',
                            zIndex: 9999,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            position: 'absolute',
                          };
                        },
                        indicatorSeparator: () => ({display: 'none'}),
                        dropdownIndicator: () => ({display: 'none'}),
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

                <div className={`Search-button-section ${showGuestDropdown ? 'active' : ''}`}
                     onClick={toggleGuestDropdown}>
                  <p className={`searchTitleGuest ${totalGuests > 0 ? 'hidden' : ''}`}>Guests</p>
                  {totalGuests > 0 && (
                      <button
                          className="Search-clear-guests"
                          onClick={resetGuests}
                          style={{
                            position: 'absolute',
                            right: '0.2rem',
                            top: '50%',
                            transform: 'translateY(-35%)',
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: isMobile ? '1.1rem' : '0.9rem',
                          }}
                      >
                        <FaTimes/>
                      </button>
                  )}

                  <p className={`Search-guestP ${hasTwoGuests ? 'nowrap' : ''}`}>
                    {totalGuestsDescription}
                  </p>
                  <div className={`Search-guest-dropdown ${showGuestDropdown ? 'active' : ''}`}
                       ref={guestDropdownRef} onClick={(e) => e.stopPropagation()}>
                    {isMobile && (
                        <button
                            className="Search-close-guest-dropdown"
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
                          <FaTimes/>
                        </button>
                    )}

                    <GuestCounter
                        label={<><FaUser/> Adults</>}
                        description="Ages 16 or above"
                        value={adults}
                        onIncrement={() => setAdults(adults < 13 ? adults + 1 : adults)}
                        onDecrement={() => setAdults(adults > 0 ? adults - 1 : adults)}
                    />
                    <GuestCounter
                        label={<><FaChild/> Children</>}
                        description="Ages 2–16"
                        value={children}
                        onIncrement={() => incrementGuests(children, setChildren)}
                        onDecrement={() => setChildren(children > 0 ? children - 1 : children)}
                    />
                    <GuestCounter
                        label={<><FaBaby/> Infants</>}
                        description="Ages 0–2"
                        value={infants}
                        onIncrement={() => incrementGuests(infants, setInfants)}
                        onDecrement={() => setInfants(infants > 0 ? infants - 1 : infants)}
                    />
                    <GuestCounter
                        label={<><FaPaw/> Pets</>}
                        description="Normal sized pets"
                        value={pets}
                        onIncrement={() => incrementGuests(pets, setPets)}
                        onDecrement={() => setPets(pets > 0 ? pets - 1 : pets)}
                    />
                    
                  </div>
                </div>


                <div className="Search-check-in" style={{position: 'relative'}}>
                  <input
                      className="input-calendar"
                      type="text"
                      value={startDate && endDate
                          ? `${formatDateToEnglish(startDate)} - ${formatDateToEnglish(endDate)}`
                          : ''}
                      readOnly={true}
                      style={{fontSize: '0.85rem'}}
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
                            transform: 'translate(-50%, -36.5%)',
                            color: 'var(--primary-color)',
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
                      value={selectedDayRange}
                      onChange={(range) => setSelectedDayRange(range)}
                      minimumDate={utils("en").getToday()}
                      shouldHighlightWeekends
                      format="MMM DD, YYYY"
                      calendarClassName="responsive-calendar"
                  />
                </div>

                <button className={`searchbar-button`} type="button" onClick={handleSearch}>
                  <FaSearchLocation size={15} style={{position: 'relative', right: '2px'}}
                                    className="search-icon"/>
                  <span className="search-text">Search</span>
                </button>

              </div>
              {/* momenteel niet te gebruiken omdat de styling er voor moet aangepast worden */}
              {/* {isBarActive && <FilterButton />} */}
            </div>
        )}
      </div>
    </>
  );
}