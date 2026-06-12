import React, { useState, useContext } from "react";
import PropTypes from "prop-types";
import {
  House,
  BarChart2,
  Building2,
  Megaphone,
  Settings,
  TrendingUp,
  Heart,
  ChevronDown,
} from "lucide-react";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const ICON_SIZE = 28;

const BADGE_ICONS   = [House, BarChart2, Building2];
const SECTION_ICONS = [Megaphone, Settings, TrendingUp, Heart];

const SectionCard = ({ title, bullets, index }) => {
  const [open, setOpen] = useState(false);
  const Icon = SECTION_ICONS[index];
  return (
    <div className={`performance__section-card${open ? " performance__section-card--open" : ""}`}>
      <div className="performance__section-icon">
        <Icon size={ICON_SIZE} />
      </div>
      <div className="performance__section-content">
        <button
          type="button"
          className="performance__section-heading"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <span className="performance__section-number">{index + 1}</span>
          <span className="performance__section-title">{title}</span>
          <ChevronDown
            className={`performance__section-chevron${open ? " performance__section-chevron--open" : ""}`}
            size={18}
          />
        </button>
        <div className="performance__section-body">
          <ul className="performance__section-list">
            {bullets.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

SectionCard.propTypes = {
  title: PropTypes.string.isRequired,
  bullets: PropTypes.arrayOf(PropTypes.string).isRequired,
  index: PropTypes.number.isRequired,
};

function Performance() {
  const { language } = useContext(LanguageContext);
  const c = contentByLanguage[language]?.performance;

  if (!c) return null;

  return (
    <div className="performance">
      <div className="performance__hero">
        <span className="performance__label">{c.label}</span>
        <h1 className="performance__title">
          {c.title}{" "}
          <span className="performance__title--accent">{c.titleAccent}</span>
        </h1>
      </div>

      <div className="performance__badges">
        {c.badges.map(({ title, subtitle }, i) => {
          const Icon = BADGE_ICONS[i];
          return (
            <div className="performance__badge" key={title}>
              <div className="performance__badge-icon">
                <Icon size={ICON_SIZE} />
              </div>
              <div>
                <p className="performance__badge-title">{title}</p>
                <p className="performance__badge-subtitle">{subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="performance__sections">
        {c.sections.map(({ title, bullets }, i) => (
          <SectionCard key={title} title={title} bullets={bullets} index={i} />
        ))}
      </div>
    </div>
  );
}

export default Performance;
