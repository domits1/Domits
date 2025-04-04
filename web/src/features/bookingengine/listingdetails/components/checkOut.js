const CheckOut = ({checkOutDate, setCheckOutDate}) => {
  return (
    <div className="date-box">
      <p className="label">Check out</p>
      <div className="date">
        {checkOutDate || "Select a date for check out"}
      </div>
    </div>
  );
};

export default CheckOut;