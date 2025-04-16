import React, { useMemo, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { format, compareAsc } from 'date-fns';

function getMinDate(priceHistory) {
  if (!priceHistory.length) return null;
  return priceHistory.reduce((minDate, item) =>
    compareAsc(item.date, minDate) < 0 ? item.date : minDate,
    priceHistory[0].date
  );
}

function getMaxDate(priceHistory) {
  if (!priceHistory.length) return null;
  return priceHistory.reduce((maxDate, item) =>
    compareAsc(item.date, maxDate) > 0 ? item.date : maxDate,
    priceHistory[0].date
  );
}

function createDateRange(start, end) {
  let dates = [];
  let current = new Date(start);
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function toYMD(date) {
  return format(date, 'yyyy-MM-dd');
}

function chunkIntoWeeks(dates) {
  const weeks = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7));
  }
  return weeks;
}

function getPriceForDate(date, priceHistory) {
  const dayKey = toYMD(date);
  const found = priceHistory.find(
    (item) => toYMD(item.date) === dayKey
  );
  return found ? found.price : null;
}

const CalendarPricingView = ({ priceHistory, onPriceUpdate }) => {
  const minDate = getMinDate(priceHistory);
  const maxDate = getMaxDate(priceHistory);
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  if (!minDate || !maxDate) return null;

  const allPrices = useMemo(() => priceHistory.map((item) => item.price), [priceHistory]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const handleDoubleClick = (date, price) => {
    setEditingCell(toYMD(date));
    setEditValue(price || '');
  };

  const handlePriceSubmit = (date) => {
    const newPrice = parseFloat(editValue);
    if (!isNaN(newPrice) && newPrice >= 0) {
      onPriceUpdate(date, newPrice);
    }
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyPress = (e, date) => {
    if (e.key === 'Enter') {
      handlePriceSubmit(date);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const getCellBackgroundColor = (price) => {
    if (price == null) return "#f7f7f7";

    if (maxPrice === minPrice) return "#a9d08e";
    const factor = (price - minPrice) / (maxPrice - minPrice);
    const hue = 120;
    const saturation = 45;
    const lightness = 92 - factor * 45;

    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  const allDates = useMemo(() => createDateRange(minDate, maxDate), [minDate, maxDate]);
  const weeks = useMemo(() => chunkIntoWeeks(allDates), [allDates]);
  const weekDayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const renderLegend = () => {
    return (
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: getCellBackgroundColor(minPrice) }}></div>
          <span>Lowest Price: €{minPrice}</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: getCellBackgroundColor(maxPrice) }}></div>
          <span>Highest Price: €{maxPrice}</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: "#f7f7f7" }}></div>
          <span>No Price Set</span>
        </div>
      </div>
    );
  };

  return (
    <div className="enhanced-calendar-wrapper">
      <h3 className="calendar-title">Calendar View</h3>
      <table className="enhanced-calendar-table">
        <thead>
          <tr>
            {weekDayHeaders.map((dayName) => (
              <th key={dayName}>{dayName}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, wIndex) => (
            <tr key={wIndex}>
              {week.map((date, dIndex) => {
                const price = getPriceForDate(date, priceHistory);
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                const dateKey = toYMD(date);
                const isEditing = editingCell === dateKey;

                return (
                  <td
                    key={dIndex}
                    className={`calendar-day ${isWeekend ? "weekend-day" : ""} ${
                      isEditing ? "editing" : ""
                    }`}
                    style={{
                      backgroundColor: getCellBackgroundColor(price),
                    }}
                    onDoubleClick={() => handleDoubleClick(date, price)}
                  >
                    <div className="calendar-date">{format(date, "dd/MM")}</div>
                    {isEditing ? (
                      <input
                        type="number"
                        className="calendar-price-input"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => handleKeyPress(e, date)}
                        onBlur={() => handlePriceSubmit(date)}
                        autoFocus
                      />
                    ) : (
                      price != null && (
                        <div className="calendar-price">€{price}</div>
                      )
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {renderLegend()}
    </div>
  );
};

CalendarPricingView.propTypes = {
  priceHistory: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.instanceOf(Date).isRequired,
    price: PropTypes.number.isRequired
  })).isRequired,
  onPriceUpdate: PropTypes.func.isRequired
};

export default CalendarPricingView;