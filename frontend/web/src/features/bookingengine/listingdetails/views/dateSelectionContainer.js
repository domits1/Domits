import CheckIn from "../components/checkIn";
import CheckOut from "../components/checkOut";

const DateSelectionContainer = ({
  checkInDate,
  setCheckInDate,
  checkOutDate,
  setCheckOutDate,
  setNights,
}) => {
  const calculateNights = () => {
    if (checkInDate && checkOutDate) {
      const checkIn = new Date(checkInDate);
      const checkOut = new Date(checkOutDate);

      const timeDifference = checkOut.getTime() - checkIn.getTime();
      const diffDays = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));

      setNights(diffDays);
      return diffDays;
    }
    return null;
  };

  const nights = calculateNights();

  return (
    <div className="date-container">
      <CheckIn
        checkInDate={checkInDate}
        setCheckInDate={setCheckInDate}
        checkOutDate={checkOutDate}
      />

      <div className="nights-info">
        {nights && <p>{`${nights} night${nights !== 1 ? "s" : ""}`}</p>}
        <div className="arrow">↔</div>
      </div>

      <CheckOut
        checkOutDate={checkOutDate}
        setCheckOutDate={setCheckOutDate}
        checkInDate={checkInDate}
      />
    </div>
  );
};

export default DateSelectionContainer;
