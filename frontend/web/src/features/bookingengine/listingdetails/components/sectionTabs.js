import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

const resolveScrollOffset = () => {
  if (globalThis.window === undefined) {
    return 190;
  }

  if (globalThis.innerWidth > 768) {
    return 190;
  }

  const rootStyles = globalThis.getComputedStyle(document.documentElement);
  const headerHeight = Number.parseFloat(rootStyles.getPropertyValue("--app-header-h")) || 90;
  const headerOffset = Number.parseFloat(rootStyles.getPropertyValue("--listing-header-offset")) || headerHeight;

  return headerOffset + 24;
};

const ACTIVE_SECTION_THRESHOLD = 210;

const scrollToSection = (sectionId) => {
  const target = document.getElementById(sectionId);
  if (!target) {
    return;
  }

  const top = globalThis.scrollY + target.getBoundingClientRect().top - resolveScrollOffset();
  globalThis.scrollTo({ top, behavior: "smooth" });
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

const SectionTabs = ({ sections = [] }) => {
  const [activeSection, setActiveSection] = useState(sections[0]?.id || "");
  const [indicatorStyle, setIndicatorStyle] = useState({});
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => globalThis.window !== undefined && globalThis.innerWidth <= 768
  );
  const buttonRefs = useRef({});

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(globalThis.innerWidth <= 768);
    };

    handleResize();
    globalThis.addEventListener("resize", handleResize);

    return () => {
      globalThis.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    if (!sections.length) {
      return undefined;
    }

    const handleScroll = () => {
      setActiveSection(resolveActiveSection(sections));
    };

    handleScroll();
    globalThis.addEventListener("scroll", handleScroll, { passive: true });
    globalThis.addEventListener("resize", handleScroll);

    return () => {
      globalThis.removeEventListener("scroll", handleScroll);
      globalThis.removeEventListener("resize", handleScroll);
    };
  }, [isMobileViewport, sections]);

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
    globalThis.addEventListener("resize", updateIndicator);

    return () => {
      globalThis.removeEventListener("resize", updateIndicator);
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

export default SectionTabs;
