import React, { useState, useEffect, useRef, useContext } from "react";
import "../styles/GuestSelector.scss";
import { LanguageContext } from "../../../context/LanguageContext.js";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const GuestSelector = ({ onClose }) => {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const { language } = useContext(LanguageContext);
  const t = contentByLanguage[language]?.guestdashboard;

  const togglePanel = () => setOpen(!open);

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

  const rows = [
    { label: t?.guestSelector?.adults || "Adults", value: adults, type: "adults", min: 1 },
    { label: t?.guestSelector?.children || "Children", value: children, type: "children", min: 0 },
    { label: t?.guestSelector?.rooms || "Rooms", value: rooms, type: "rooms", min: 1 },
  ];

  return (
    <div className="guestSelector" ref={wrapperRef}>
      <button className="selectorButton" onClick={togglePanel}>
        {adults} {t?.guestSelector?.adults?.toLowerCase() || "adults"} · {children} {t?.guestSelector?.children?.toLowerCase() || "children"} · {rooms} {t?.guestSelector?.rooms?.toLowerCase() || "room"}{rooms > 1 ? "s" : ""}
      </button>

      {open && (
        <div className="dropdownPanel">
          {rows.map((item) => (
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
            {t?.guestSelector?.done || "Done"}
          </button>
        </div>
      )}
    </div>
  );
};

export default GuestSelector;
