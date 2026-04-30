import PropTypes from "prop-types";
import { useState } from "react";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

const GuestSelectionContainer = ({ setAdultsParent, setKidsParent }) => {
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [expanded, setExpanded] = useState(false);

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

  const totalGuests = adults + kids;
  const guestLabel = `${totalGuests} guest${totalGuests !== 1 ? "s" : ""}`;

  return (
    <div className="guests-container">
      <button
        type="button"
        className="guests-summary"
        onClick={() => setExpanded((prev) => !prev)}
        aria-expanded={expanded}
      >
        <PersonOutlineIcon className="guests-summary__icon" fontSize="small" />
        <span className="guests-summary__label">{guestLabel}</span>
        {expanded
          ? <KeyboardArrowUpIcon className="guests-summary__chevron" fontSize="small" />
          : <KeyboardArrowDownIcon className="guests-summary__chevron" fontSize="small" />
        }
      </button>

      {expanded && (
        <div className="guests-inputs">
          <div className="guests-inputs__row">
            <label className="guests-inputs__label">Adults</label>
            <input
              type="number"
              className="guests-inputs__field"
              value={adults}
              min="1"
              onChange={handleAdultsChange}
            />
          </div>
          <div className="guests-inputs__row">
            <label className="guests-inputs__label">Kids</label>
            <input
              type="number"
              className="guests-inputs__field"
              value={kids}
              min="0"
              onChange={handleKidsChange}
            />
          </div>
        </div>
      )}
    </div>
  );
};

GuestSelectionContainer.propTypes = {
  setAdultsParent: PropTypes.func.isRequired,
  setKidsParent: PropTypes.func.isRequired,
};

export default GuestSelectionContainer;
