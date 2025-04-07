import { useState } from "react";

const GuestSelectionContainer = ({setAdultsParent}) => {
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);

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
            onChange={(event) => {
              setAdults(parseFloat(event.target.value))
              setAdultsParent(parseFloat(event.target.value))
            }}
          />{" "}
          adults
        </div>
        <div className="inputField" style={{ width: "auto", marginLeft: "10px" }}>
          <input
            type="number"
            value={kids}
            style={{ width: "30px" }}
            min="0"
            onChange={(event) => {
              setKids(parseFloat(event.target.value))
            }}
          />{" "}
          kids
        </div>
      </div>
    </div>
  );
};

export default GuestSelectionContainer;
