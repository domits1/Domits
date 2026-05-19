import PropTypes from "prop-types";
import { useState } from "react";

const GuestSelectionContainer = ({ setAdultsParent, setKidsParent }) => {
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);

  const handleAdultsChange = (event) => {
    const nextValue = Math.max(1, Number.parseInt(event.target.value, 10) || 0);
    setAdults(nextValue);
    setAdultsParent(nextValue);
  };

  const handleKidsChange = (event) => {
    const nextValue = Math.max(0, Number.parseInt(event.target.value, 10) || 0);
    setKids(nextValue);
    setKidsParent(nextValue);
  };

  return (
    <div className="guests-container">
      <p className="label">Guests</p>
      <div className="guests-inputFields">
        <div className="inputField" style={{ width: "auto" }}>
          <input
            type="number"
            value={adults}
            style={{ width: "30px" }}
            min="1"
            onChange={handleAdultsChange}
          />{" "}
          adults
        </div>
        <div
          className="inputField"
          style={{ width: "auto", marginLeft: "10px" }}
        >
          <input
            type="number"
            value={kids}
            style={{ width: "30px" }}
            min="0"
            onChange={handleKidsChange}
          />{" "}
          kids
        </div>
      </div>
    </div>
  );
};

GuestSelectionContainer.propTypes = {
  setAdultsParent: PropTypes.func.isRequired,
  setKidsParent: PropTypes.func.isRequired,
};

export default GuestSelectionContainer;
