import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

const SCROLL_OFFSET = 190;
const ACTIVE_SECTION_THRESHOLD = 210;

const scrollToSection = (sectionId) => {
  const target = document.getElementById(sectionId);
  if (!target) {
    return;
  }

  const top = window.scrollY + target.getBoundingClientRect().top - SCROLL_OFFSET;
  window.scrollTo({ top, behavior: "smooth" });
};

const resolveActiveSection = (sections) => {
  const matchingSection = sections.reduce((currentMatch, section) => {
    const element = document.getElementById(section.targetId);
    if (!element) {
      return currentMatch;
    }

    const { top } = element.getBoundingClientRect();
    if (top <= ACTIVE_SECTION_THRESHOLD) {
      return section.id;
    }

    return currentMatch;
  }, sections[0]?.id || "");

  return matchingSection || sections[0]?.id || "";
};

const SectionTabs = ({ sections }) => {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || "");
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const buttonRefs = useRef({});

  useEffect(() => {
    if (!sections.length) {
      return undefined;
    }

    const handleScroll = () => {
      setActiveSection(resolveActiveSection(sections));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [sections]);

  useEffect(() => {
    const updateIndicator = () => {
      const activeButton = buttonRefs.current[activeSection];
      if (!activeButton) {
        return;
      }

      setIndicatorStyle({
        width: `${activeButton.offsetWidth}px`,
        transform: `translateX(${activeButton.offsetLeft}px)`,
      });
    };

    updateIndicator();
    window.addEventListener("resize", updateIndicator);

    return () => {
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeSection, sections]);

  if (!sections.length) {
    return null;
  }

  return (
    <div className="listing-sections-shell">
      <nav className="listing-sections-nav" aria-label="Listing sections">
        <div className="listing-sections-nav__track" style={indicatorStyle} />
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            ref={(element) => {
              buttonRefs.current[section.id] = element;
            }}
            className={`listing-sections-nav__button ${activeSection === section.id ? "is-active" : ""}`}
            onClick={() => {
              setActiveSection(section.id);
              scrollToSection(section.targetId);
            }}
          >
            <span>{section.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

SectionTabs.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      targetId: PropTypes.string.isRequired,
    })
  ),
};

SectionTabs.defaultProps = {
  sections: [],
};

export default SectionTabs;
