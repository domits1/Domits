import DatePicker from "react-datepicker";
import PropTypes from "prop-types";
import {
  buildUnavailableDateSet,
  getFutureDateKey,
  isUnavailableDate,
  normalizeDateValue,
  toDateKey,
} from "../utils/dateAvailability";

const CheckIn = ({
  checkInDate = "",
  setCheckInDate = () => {},
  unavailableDateKeys = [],
}) => {
  const unavailableDateSet = buildUnavailableDateSet(unavailableDateKeys);
  const minDate = normalizeDateValue(getFutureDateKey(1));

  return (
    <div className="date-box">
      <p className="label">Check in</p>
      <DatePicker
        selected={normalizeDateValue(checkInDate)}
        onChange={(date) => setCheckInDate(date ? toDateKey(date) : "")}
        className="inputField"
        minDate={minDate}
        filterDate={(date) => !isUnavailableDate(date, unavailableDateSet)}
        dayClassName={(date) => (toDateKey(date) === toDateKey(new Date()) ? "booking-picker-day--today" : "")}
        dateFormat="yyyy-MM-dd"
        placeholderText="YYYY-MM-DD"
      />
    </div>
  );
};

CheckIn.propTypes = {
  checkInDate: PropTypes.string,
  setCheckInDate: PropTypes.func,
  unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
};

export default CheckIn;
