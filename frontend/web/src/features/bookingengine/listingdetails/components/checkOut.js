const CheckOut = ({ checkOutDate, setCheckOutDate, checkInDate }) => {
  // Calculate min date as day after checkInDate
  const getMinDate = () => {
    if (checkInDate) {
      const checkIn = new Date(checkInDate);
      checkIn.setDate(checkIn.getDate() + 1);
      return checkIn.toISOString().split("T")[0];
    }
    // Default to tomorrow if no checkInDate
    return new Date(Date.now() + 86400000).toISOString().split("T")[0];
  };

  return (
    <div className="date-box">
      <p className="label">Check out</p>
      <input
        type="date"
        onChange={(event) => {
          const value = event.target.value;
          if (!value) {
            setCheckOutDate("");
            return;
          }
          if (checkInDate > value || checkInDate === value) {
            alert("Check out date has to be after check in date.");
            event.target.value = checkOutDate || "";
          } else {
            setCheckOutDate(value);
          }
        }}
        value={checkOutDate}
        className="inputField"
        disabled={!checkInDate}
        min={getMinDate()}
      />
    </div>
  );
};

export default CheckOut;
