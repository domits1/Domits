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
  availabilityRanges = null,
  availableDateKeys = null,
  className = "",
}) => {
  const containerClassName = className ? `date-container ${className}` : "date-container";

  return (
    <div className={containerClassName}>
      <CheckIn
        checkInDate={checkInDate}
        setCheckInDate={setCheckInDate}
        unavailableDateKeys={unavailableDateKeys}
        availabilityRanges={availabilityRanges}
        availableDateKeys={availableDateKeys}
      />

      <CheckOut
        checkOutDate={checkOutDate}
        setCheckOutDate={setCheckOutDate}
        checkInDate={checkInDate}
        unavailableDateKeys={unavailableDateKeys}
        availabilityRanges={availabilityRanges}
        availableDateKeys={availableDateKeys}
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
  availabilityRanges: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.number.isRequired,
      end: PropTypes.number.isRequired,
    })
  ),
  availableDateKeys: PropTypes.arrayOf(PropTypes.string),
  className: PropTypes.string,
};

export default DateSelectionContainer;
