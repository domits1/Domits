import React, { useState, useEffect, useRef } from "react";
import "../styles/GuestSelector.scss";

const GuestSelector = ({ onClose }) => {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const togglePanel = () => setOpen(!open);

  // Change number of adults, children or rooms
  const updateCount = (type, operation) => {
    if (type === "adults") {
      setAdults((prev) => Math.max(1, prev + (operation === "+" ? 1 : -1)));
    } else if (type === "children") {
      setChildren((prev) => Math.max(0, prev + (operation === "+" ? 1 : -1)));
    } else if (type === "rooms") {
      setRooms((prev) => Math.max(1, prev + (operation === "+" ? 1 : -1)));
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (onClose) onClose({ adults, children, rooms });
  };

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (open && wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        handleClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <div className="guestSelector" ref={wrapperRef}>
      <button className="selectorButton" onClick={togglePanel}>
        {adults} adults · {children} children · {rooms} room{rooms > 1 ? "s" : ""}
      </button>

      {open && (
        <div className="dropdownPanel">
          {[
            { label: "Adults", value: adults, type: "adults", min: 1 },
            { label: "Children", value: children, type: "children", min: 0 },
            { label: "Rooms", value: rooms, type: "rooms", min: 1 },
          ].map((item) => (
            <div className="row" key={item.type}>
              <span>{item.label}</span>
              <div className="counter">
                <button onClick={() => updateCount(item.type, "-")} disabled={item.value <= item.min}>
                  –
                </button>
                <span>{item.value}</span>
                <button onClick={() => updateCount(item.type, "+")}>+</button>
              </div>
            </div>
          ))}

          <button className="doneButton" onClick={handleClose}>
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default GuestSelector;
