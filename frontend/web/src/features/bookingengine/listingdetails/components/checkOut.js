const CheckOut = ({ checkOutDate, setCheckOutDate, checkInDate }) => {
  const DAY_IN_MS = 24 * 60 * 60 * 1000;
  const getMinDate = () => {
    if (checkInDate) {
      const checkIn = new Date(checkInDate);
      checkIn.setDate(checkIn.getDate() + 1);
      return checkIn.toISOString().split("T")[0];
    }
    return new Date(Date.now() + DAY_IN_MS).toISOString().split("T")[0];
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
