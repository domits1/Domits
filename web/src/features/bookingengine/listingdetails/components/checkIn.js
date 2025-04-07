const CheckIn = ({ checkInDate, setCheckInDate, checkOutDate }) => {
  return (
    <div className="date-box">
      <p className="label">Check in</p>
      <input
        type="date"
        onChange={(event) => {
          const value = event.target.value;
          if (checkOutDate && checkOutDate < value) {
            alert("Check in date can't be after check out date.");
            event.target.value = checkInDate || "";
          } else {
            setCheckInDate(value);
          }
        }}
        value={checkInDate}
        className="date"
      />
    </div>
  );
};

export default CheckIn;
