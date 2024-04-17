import React, { useState } from 'react';
import './SearchCalendar.css'; 
const SearchCalendar = () => {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectingStart, setSelectingStart] = useState(true);

  const handleDateClick = (date) => {
    if (selectingStart) {
      setStartDate(date);
      setEndDate(null); 
      setSelectingStart(false);
    } else {
      if (date < startDate) {
        setStartDate(date);
        setEndDate(null);
        setSelectingStart(false);
      } else {
        setEndDate(date);
        setSelectingStart(true); 
      }
    }
  };

  return (
    <div className="search-calendar">
      <div>
        <p>Select your dates:</p>
        <p>Start Date: {startDate ? startDate.toDateString() : 'Select start date'}</p>
        <p>End Date: {endDate ? endDate.toDateString() : 'Select end date'}</p>
      </div>
      <div className="date-grid">
        {Array.from({ length: 30 }, (_, i) => new Date(2024, 0, i + 1)).map(date => (
          <button
            key={date.toISOString()}
            onClick={() => handleDateClick(date)}
            className={`date-button ${date === startDate ? 'selected' : ''} ${date === endDate ? 'selected' : ''}`}
          >
            {date.getDate()}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchCalendar;
