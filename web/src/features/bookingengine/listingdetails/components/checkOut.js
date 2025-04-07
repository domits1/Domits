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
          if (checkInDate > value || checkInDate === value) {
            alert("Check out date has to be after check in date.");
            event.target.value = checkOutDate || "";
          } else {
            setCheckOutDate(value);
          }
        }}
        defaultValue={checkOutDate}
        value={checkOutDate}
        className="inputField"
        disabled={!checkInDate}
        min={new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]}
      />
    </div>
  );
};

export default CheckOut;
