import PropTypes from "prop-types";
import CheckIn from "../components/checkIn";
import CheckOut from "../components/checkOut";

const DateSelectionContainer = ({ checkInDate, setCheckInDate, checkOutDate, setCheckOutDate }) => {
  return (
    <div className="date-container">
      <CheckIn checkInDate={checkInDate} setCheckInDate={setCheckInDate} />

      <CheckOut checkOutDate={checkOutDate} setCheckOutDate={setCheckOutDate} checkInDate={checkInDate} />
    </div>
  );
};

DateSelectionContainer.propTypes = {
  checkInDate: PropTypes.string,
  setCheckInDate: PropTypes.func,
  checkOutDate: PropTypes.string,
  setCheckOutDate: PropTypes.func,
};

DateSelectionContainer.defaultProps = {
  checkInDate: "",
  setCheckInDate: () => {},
  checkOutDate: "",
  setCheckOutDate: () => {},
};

export default DateSelectionContainer;
