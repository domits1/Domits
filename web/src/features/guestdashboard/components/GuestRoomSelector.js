import React, { useState } from "react";
import "../styles/guestRoomSelector.css";

const GuestRoomSelector = () => {
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [isOpen, setIsOpen] = useState(false);

  const handleIncrement = (type) => {
    if (type === "adults") setAdults(adults + 1);
    if (type === "children") setChildren(children + 1);
    if (type === "rooms") setRooms(rooms + 1);
  };

  const handleDecrement = (type) => {
    if (type === "adults" && adults > 1) setAdults(adults - 1);
    if (type === "children" && children > 0) setChildren(children - 1);
    if (type === "rooms" && rooms > 1) setRooms(rooms - 1);
  };

  return (
    <div className="guest-room-selector">
      <button className="selector-button" onClick={() => setIsOpen(!isOpen)}>
        {adults} Adults · {children} Children · {rooms} Room{rooms > 1 ? "s" : ""}
      </button>

      {isOpen && (
        <div className="dropdown-menu">
          <div className="option">
            <span>Adults</span>
            <div className="controls">
              <button onClick={() => handleDecrement("adults")}>-</button>
              <span>{adults}</span>
              <button onClick={() => handleIncrement("adults")}>+</button>
            </div>
          </div>

          <div className="option">
            <span>Children</span>
            <div className="controls">
              <button onClick={() => handleDecrement("children")}>-</button>
              <span>{children}</span>
              <button onClick={() => handleIncrement("children")}>+</button>
            </div>
          </div>

          <div className="option">
            <span>Rooms</span>
            <div className="controls">
              <button onClick={() => handleDecrement("rooms")}>-</button>
              <span>{rooms}</span>
              <button onClick={() => handleIncrement("rooms")}>+</button>
            </div>
          </div>

          <button className="apply-button" onClick={() => setIsOpen(false)}>
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default GuestRoomSelector;
