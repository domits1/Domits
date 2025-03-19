import React, { useMemo } from 'react';
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

const CalendarPricingView = ({ priceHistory }) => {
  const minDate = getMinDate(priceHistory);
  const maxDate = getMaxDate(priceHistory);
  if (!minDate || !maxDate) return null;

  const allPrices = useMemo(() => priceHistory.map((item) => item.price), [priceHistory]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);

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

                return (
                  <td
                    key={dIndex}
                    className={`calendar-day ${isWeekend ? "weekend-day" : ""}`}
                    style={{
                      backgroundColor: getCellBackgroundColor(price),
                    }}
                  >
                    <div className="calendar-date">{format(date, "dd/MM")}</div>
                    {price != null && (
                      <div className="calendar-price">€{price}</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

CalendarPricingView.propTypes = {
  priceHistory: PropTypes.arrayOf(PropTypes.shape({
    date: PropTypes.instanceOf(Date).isRequired,
    price: PropTypes.number.isRequired
  })).isRequired
};

export default CalendarPricingView; 