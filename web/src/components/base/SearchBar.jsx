// For explenation on how search works: https://github.com/domits1/Domits/wiki/Web-Search
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '@hassanmojab/react-modern-calendar-datepicker/lib/DatePicker.css';
import DatePicker, { utils } from '@hassanmojab/react-modern-calendar-datepicker';
import {
  FaTimes, FaSearchLocation, FaHome, FaCaravan, FaDoorClosed,
  FaShip, FaTimesCircle, FaUser, FaChild, FaBaby, FaPaw,
} from 'react-icons/fa';
import Select from 'react-select';
import '../../styles/sass/base/SearchBar.scss';
import { useNavigate, useLocation } from 'react-router-dom';

export const SearchBar = ({ setSearchResults, setLoading = () => {}, toggleBar }) => {
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
    if (setLoading) {
      setLoading(true);
    }
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
      if (setLoading) {
        setLoading(false);
      }
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

  function handleKeyDown(e){
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  useEffect(() => {
    if (selectedDayRange.from && selectedDayRange.to) {
      const startDate = new Date(
        selectedDayRange.from.year,
        selectedDayRange.from.month - 1,
        selectedDayRange.from.day
      );
      const endDate = new Date(
        selectedDayRange.to.year,
        selectedDayRange.to.month - 1,
        selectedDayRange.to.day
      );
      setDateRange([startDate, endDate]);
      setCheckIn(startDate);
      setCheckOut(endDate);
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
      {/* <div className="bar-container"> */}
        {isMobile && (
          <button className="mobile-search-button" onClick={toggleSearchBar}>
            <FaSearchLocation size={15} /> 
            {/* Search & Filter Accommodations */}
          </button>
        )}

        {(showSearchBar || !isMobile) && (
          <div className={`Search-Bar-Main-Container ${isBarActive ? 'active' : 'inactive'}`}>
            <div className="Search-bar-main">
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
              <div className="searchSelectContainer">
                <Select
                  value={accommodation ? { label: accommodation, value: accommodation } : null}
                  onChange={(selectedOption) => setAccommodation(selectedOption ? selectedOption.value : '')}
                  options={[
                    { value: 'House', label: <><FaHome /> House</> },
                    { value: 'Boat', label: <><FaShip /> Boat</> },
                    { value: 'Camper', label: <><FaCaravan /> Camper</> },
                  ]}
                  isSearchable={false}
                  isClearable={true}
                  placeholder={<span className="searchTitle">Accommodation</span>}
                  classNamePrefix="custom-select-dropdown-menu"
                  components={{ DropdownIndicator: () => null, IndicatorSeparator: () => null }}
                />
              </div>

              <div className={`Search-button-section ${showGuestDropdown ? 'active' : ''}`}
                onClick={toggleGuestDropdown}>
                <p className={`searchTitleGuest ${totalGuests > 0 ? 'hidden' : ''}`}>Guests</p>
                {totalGuests > 0 && (
                  <button className="search-clear-guests" onClick={resetGuests}>
                    <FaTimes />
                  </button>
                )}

                <p className={`Search-guestP ${hasTwoGuests}`}>
                  {totalGuestsDescription}
                </p>
                <div className={`Search-guest-dropdown ${showGuestDropdown ? 'active' : ''}`}
                  ref={guestDropdownRef} onClick={(e) => e.stopPropagation()}>
                  {isMobile && (
                    <button
                      className="Search-close-guest-dropdown"
                      onClick={closeGuestDropdown}
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
                </div>
              </div>

              <div className="Search-check-in-out">
                <input
                  className="input-calendar-checkInOut"
                  type="text"
                  value={startDate && endDate ? `${formatDateToEnglish(startDate)} - ${formatDateToEnglish(endDate)}` : ''}
                  readOnly={true}
                />
                {!startDate && !endDate && (
                  <span className='Calendar-placeholder'>
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

              <button className="searchbar-button" type="button" onClick={handleSearch}>
                <FaSearchLocation size={15}
                  className="search-icon" />
                <span className="search-text">Search</span>
              </button>
            </div>
            {/* momenteel niet te gebruiken omdat de styling er voor moet aangepast worden */}
            {/* {isBarActive && <FilterButton />} */}
          </div>
        )}
      {/* </div> */}
    </>
  );
}