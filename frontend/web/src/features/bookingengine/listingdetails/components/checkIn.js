import PropTypes from "prop-types";
import { getFutureDateKey } from "../utils/dateAvailability";

const CheckIn = ({ checkInDate, setCheckInDate }) => {
  return (
    <div className="date-box">
      <p className="label">Check in</p>
      <input
        type="date"
        onChange={(event) => setCheckInDate(event.target.value)}
        value={checkInDate}
        className="inputField"
        min={getFutureDateKey(1)}
      />
    </div>
  );
};

CheckIn.propTypes = {
  checkInDate: PropTypes.string,
  setCheckInDate: PropTypes.func,
};

CheckIn.defaultProps = {
  checkInDate: "",
  setCheckInDate: () => {},
};

export default CheckIn;
