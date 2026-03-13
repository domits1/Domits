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
}) => {
  return (
    <div className="date-container">
      <CheckIn
        checkInDate={checkInDate}
        setCheckInDate={setCheckInDate}
        unavailableDateKeys={unavailableDateKeys}
      />

      <CheckOut
        checkOutDate={checkOutDate}
        setCheckOutDate={setCheckOutDate}
        checkInDate={checkInDate}
        unavailableDateKeys={unavailableDateKeys}
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
};

export default DateSelectionContainer;
