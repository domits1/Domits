import React, { useEffect, useMemo, useRef, useState } from "react";
import PulseBarsLoader from "./PulseBarsLoader";
import arrowDownIcon from "../../../../images/arrow-down-icon.svg";
import arrowUpIcon from "../../../../images/arrow-up-icon.svg";

const resolveStatusDotClass = (status) => {
  const normalizedStatus = String(status || "INACTIVE").toUpperCase();
  if (normalizedStatus === "ACTIVE") {
    return "hc-status-dot--active";
  }
  if (normalizedStatus === "ARCHIVED") {
    return "hc-status-dot--archived";
  }
  return "hc-status-dot--inactive";
};

export default function Toolbar({
  view,
  onViewChange,
  onToday,
  listingOptions,
  selectedPropertyId,
  onSelectProperty,
  isLoadingListings,
}) {
  const options = Array.isArray(listingOptions) ? listingOptions : [];
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = useMemo(() => {
    if (!options.length) {
      return null;
    }
    const match = options.find((option) => option.value === selectedPropertyId);
    return match || options[0];
  }, [options, selectedPropertyId]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handleEscapePress = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscapePress);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscapePress);
    };
  }, [menuOpen]);

  const toggleListingMenu = () => {
    if (isLoadingListings || options.length === 0) {
      return;
    }
    setMenuOpen((previous) => !previous);
  };

  const handleListingSelect = (nextPropertyId) => {
    setMenuOpen(false);
    if (!nextPropertyId || nextPropertyId === selectedPropertyId) {
      return;
    }
    onSelectProperty(nextPropertyId);
  };

  return (
    <div className="hc-toolbar" role="group" aria-label="Calendar controls">
      <div className="hc-listing-dropdown" ref={dropdownRef}>
        <button
          type="button"
          className="hc-listing-trigger"
          onClick={toggleListingMenu}
          disabled={isLoadingListings || options.length === 0}
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          aria-label="Select listing"
        >
          {isLoadingListings ? (
            <PulseBarsLoader
              inline
              className="hc-listing-trigger-loader"
              message="Loading accommodations..."
            />
          ) : selectedOption ? (
            <>
              <span className={`hc-status-dot ${resolveStatusDotClass(selectedOption.status)}`} />
              <span className="hc-listing-trigger-label">{selectedOption.label}</span>
            </>
          ) : (
            <span className="hc-listing-trigger-label">No listings found</span>
          )}
          <span className="hc-listing-trigger-chevron" aria-hidden="true">
            <img
              src={menuOpen ? arrowUpIcon : arrowDownIcon}
              alt=""
              className="hc-chevron-icon hc-listing-trigger-chevron-icon"
            />
          </span>
        </button>

        {menuOpen && (
          <ul className="hc-listing-menu" role="listbox" aria-label="Choose listing">
            {options.map((option) => {
              const isSelected = option.value === selectedPropertyId;
              return (
                <li key={option.value} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={`hc-listing-option ${isSelected ? "is-selected" : ""}`}
                    onClick={() => handleListingSelect(option.value)}
                  >
                    <span className={`hc-status-dot ${resolveStatusDotClass(option.status)}`} />
                    <span className="hc-listing-option-label">{option.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="hc-toolbar-actions">
        <button type="button" className="hc-today-button" onClick={onToday}>
          Today
        </button>

        <label className="hc-select-wrap hc-select-wrap--compact" htmlFor="host-calendar-view">
          <span className="hc-sr-only">Calendar view</span>
          <select
            id="host-calendar-view"
            className="hc-select hc-select--compact"
            value={view}
            onChange={(event) => onViewChange(event.target.value)}
          >
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
          <span className="hc-select-wrap-icon" aria-hidden="true">
            <img src={arrowDownIcon} alt="" className="hc-chevron-icon hc-select-wrap-icon-image" />
          </span>
        </label>
      </div>
    </div>
  );
}
