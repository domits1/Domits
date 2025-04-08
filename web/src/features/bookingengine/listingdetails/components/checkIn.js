const CheckIn = ({ checkInDate, setCheckInDate, checkOutDate }) => {
  return (
    <div className="date-box">
      <p className="label">Check in</p>
      <input
        type="date"
        onChange={(event) => {
          const value = event.target.value;
          if (checkOutDate && checkOutDate < value || checkOutDate && value === checkOutDate) {
            alert("Check in date has to be before check out date.");
            event.target.value = checkInDate || "";
          } else {
            setCheckInDate(value);
          }
        }}
        value={checkInDate}
        className="inputField"
        min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
      />
    </div>
  );
};

export default CheckIn;
