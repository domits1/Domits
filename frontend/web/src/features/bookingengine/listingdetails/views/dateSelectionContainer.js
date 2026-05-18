import "react-datepicker/dist/react-datepicker.css";
import PropTypes from "prop-types";
import CheckIn from "../components/checkIn";
import CheckOut from "../components/checkOut";

const DateSelectionContainer = ({
  checkInDate = "",
  setCheckInDate = () => {},
  checkOutDate = "",
  setCheckOutDate = () => {},
  unavailableDateKeys = [],
  className = "",
  popperFixed = false,
}) => {
  const containerClassName = className ? `date-container ${className}` : "date-container";

  return (
    <div className={containerClassName}>
      <CheckIn
        checkInDate={checkInDate}
        setCheckInDate={setCheckInDate}
        unavailableDateKeys={unavailableDateKeys}
        popperFixed={popperFixed}
      />

      <CheckOut
        checkOutDate={checkOutDate}
        setCheckOutDate={setCheckOutDate}
        checkInDate={checkInDate}
        unavailableDateKeys={unavailableDateKeys}
        popperFixed={popperFixed}
      />
    </div>
  );
};

DateSelectionContainer.propTypes = {
  checkInDate: PropTypes.string,
  setCheckInDate: PropTypes.func,
  checkOutDate: PropTypes.string,
  setCheckOutDate: PropTypes.func,
  unavailableDateKeys: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
  popperFixed: PropTypes.bool,
};

export default DateSelectionContainer;
