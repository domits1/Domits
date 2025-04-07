const CheckOut = ({ checkOutDate, setCheckOutDate, checkInDate }) => {
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
          if (checkInDate > value) {
            alert("Check out date can't be before check in date.");
            event.target.value = checkOutDate || "";
          } else {
            setCheckOutDate(value);
          }
        }}
        value={checkOutDate}
        className="inputField"
        disabled={!checkInDate}
      />
    </div>
  );
};

export default CheckOut;
