import PropTypes from "prop-types";
import { addDaysToDateKey, getFutureDateKey } from "../utils/dateAvailability";

const CheckOut = ({
  checkOutDate = "",
  setCheckOutDate = () => {},
  checkInDate = "",
}) => {
  const minCheckOutDate = checkInDate ? addDaysToDateKey(checkInDate, 1) : getFutureDateKey(2);

  return (
    <div className="date-box">
      <p className="label">Check out</p>
      <input
        type="date"
        onChange={(event) => setCheckOutDate(event.target.value)}
        value={checkOutDate}
        className="inputField"
        disabled={!checkInDate}
        min={minCheckOutDate}
      />
    </div>
  );
};

CheckOut.propTypes = {
  checkOutDate: PropTypes.string,
  setCheckOutDate: PropTypes.func,
  checkInDate: PropTypes.string,
};

export default CheckOut;
