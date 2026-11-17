import React, { useContext, useEffect, useId, useRef, useState } from "react";
import PropTypes from "prop-types";
import arrowDown from "../../../images/arrow-down-icon.svg";
import { LanguageContext } from "../../../context/LanguageContext";
import en from "../../../content/en.json";
import nl from "../../../content/nl.json";
import de from "../../../content/de.json";
import es from "../../../content/es.json";
import "../styles/destinations-menu.scss";

const contentByLanguage = { en, nl, de, es };

const ARROW_STEPS = { ArrowDown: 1, ArrowUp: -1, ArrowRight: 1, ArrowLeft: -1 };

function DestinationsMenu({ continents, onOpen }) {
  const { language } = useContext(LanguageContext);
  const copy = contentByLanguage[language]?.component?.destinations || en.component.destinations;
  const panelId = useId();
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const continentRefs = useRef([]);
  const [open, setOpen] = useState(false);
  const [selectedPath, setSelectedPath] = useState("");

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const selected = continents.find((continent) => continent.path === selectedPath) || continents[0];
  if (!selected) {
    return null;
  }

  const moveBetweenContinents = (event, index) => {
    const step = ARROW_STEPS[event.key];
    if (!step) {
      return;
    }
    event.preventDefault();
    const next = (index + step + continents.length) % continents.length;
    continentRefs.current[next]?.focus();
    setSelectedPath(continents[next].path);
  };

  return (
    <div className="destinations-menu" ref={rootRef}>
      <button
        type="button"
        ref={triggerRef}
        className="headerButtons destinations-menu__trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          if (!open) {
            onOpen?.();
          }
          setOpen(!open);
        }}>
        {copy.title}
        <img src={arrowDown} alt="" />
      </button>
      {open && (
        <div className="destinations-menu__panel" id={panelId}>
          <div className="destinations-menu__layout">
            <ul className="destinations-menu__continents">
              {continents.map((continent, index) => {
                const isSelected = continent.path === selected.path;
                return (
                  <li key={continent.path}>
                    <button
                      type="button"
                      ref={(element) => {
                        continentRefs.current[index] = element;
                      }}
                      className={`destinations-menu__continent${isSelected ? " is-selected" : ""}`}
                      tabIndex={isSelected ? 0 : -1}
                      aria-current={isSelected ? "true" : undefined}
                      onMouseEnter={() => setSelectedPath(continent.path)}
                      onFocus={() => setSelectedPath(continent.path)}
                      onClick={() => setSelectedPath(continent.path)}
                      onKeyDown={(event) => moveBetweenContinents(event, index)}>
                      <span>{continent.name}</span>
                      <span className="destinations-menu__count">{continent.activeListings}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="destinations-menu__countries">
              <a className="destinations-menu__all" href={selected.path}>
                {copy.allIn} {selected.name}
              </a>
              {selected.countries.map((country) => (
                <section key={country.path} className="destinations-menu__country">
                  <h3>
                    <a href={country.path}>{country.name}</a>
                    <span className="destinations-menu__count">{country.activeListings}</span>
                  </h3>
                  {country.cities.length > 0 && (
                    <ul>
                      {country.cities.map((city) => (
                        <li key={city.path}>
                          <a href={city.path}>{city.name}</a>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const itemShape = {
  name: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  activeListings: PropTypes.number.isRequired,
};

DestinationsMenu.propTypes = {
  continents: PropTypes.arrayOf(
    PropTypes.shape({
      ...itemShape,
      countries: PropTypes.arrayOf(
        PropTypes.shape({
          ...itemShape,
          cities: PropTypes.arrayOf(PropTypes.shape(itemShape)).isRequired,
        })
      ).isRequired,
    })
  ).isRequired,
  onOpen: PropTypes.func,
};

export default DestinationsMenu;
