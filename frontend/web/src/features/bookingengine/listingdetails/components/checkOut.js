import DatePicker from "react-datepicker";
import PropTypes from "prop-types";
import {
  addDaysToDateKey,
  buildUnavailableDateSet,
  getFutureDateKey,
  hasUnavailableDateInStayRange,
  normalizeDateValue,
  toDateKey,
} from "../utils/dateAvailability";

const CheckOut = ({
  checkOutDate = "",
  setCheckOutDate = () => {},
  checkInDate = "",
  unavailableDateKeys = [],
}) => {
  const minCheckOutDate = checkInDate ? addDaysToDateKey(checkInDate, 1) : getFutureDateKey(2);
  const unavailableDateSet = buildUnavailableDateSet(unavailableDateKeys);
  const selectedCheckOutDate = normalizeDateValue(checkOutDate);
  const selectedCheckInDate = normalizeDateValue(checkInDate);

  return (
    <div className="date-box">
      <p className="label">Check out</p>
      <DatePicker
        selected={selectedCheckOutDate}
        onChange={(date) => setCheckOutDate(date ? toDateKey(date) : "")}
        className="inputField"
        disabled={!checkInDate}
        minDate={normalizeDateValue(minCheckOutDate)}
        filterDate={(date) => {
          if (!selectedCheckInDate) {
            return false;
          }

          return !hasUnavailableDateInStayRange(selectedCheckInDate, date, unavailableDateSet);
        }}
        dayClassName={(date) => (toDateKey(date) === toDateKey(new Date()) ? "booking-picker-day--today" : "")}
        dateFormat="yyyy-MM-dd"
        placeholderText="YYYY-MM-DD"
      />
    </div>
  );
};

CheckOut.propTypes = {
  checkOutDate: PropTypes.string,
  setCheckOutDate: PropTypes.func,
  checkInDate: PropTypes.string,
  unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
};

export default CheckOut;
