import React, { useState, useContext } from "react";
import { Recycle, Award, Leaf, ChevronDown } from "lucide-react";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const ICON_SIZE = 28;
const SECTION_ICONS = [Recycle, Award, Leaf];

const SectionCard = ({ title, subtitle, description, index }) => {
  const [open, setOpen] = useState(false);
  const Icon = SECTION_ICONS[index];
  return (
    <div className={`sustainability__section-card${open ? " sustainability__section-card--open" : ""}`}>
      <div className="sustainability__section-icon">
        <Icon size={ICON_SIZE} />
      </div>
      <div className="sustainability__section-content">
        <button
          type="button"
          className="sustainability__section-heading"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <span className="sustainability__section-number">{index + 1}</span>
          <span className="sustainability__section-title">{title}</span>
          <ChevronDown
            className={`sustainability__section-chevron${open ? " sustainability__section-chevron--open" : ""}`}
            size={18}
          />
        </button>
        <div className="sustainability__section-body">
          {subtitle && <p className="sustainability__section-subtitle">{subtitle}</p>}
          <p className="sustainability__section-description">{description}</p>
        </div>
      </div>
    </div>
  );
};

function Sustainability() {
  const { language } = useContext(LanguageContext);
  const c = contentByLanguage[language]?.sustainability;

  if (!c) return null;

  return (
    <div className="sustainability">
      <div className="sustainability__hero">
        <span className="sustainability__label">{c.label}</span>
        <h1 className="sustainability__title">
          {c.title}{" "}
          <span className="sustainability__title--accent">{c.titleAccent}</span>
        </h1>
      </div>

      <div className="sustainability__sections">
        {c.sections.map(({ title, subtitle, description }, i) => (
          <SectionCard key={title} title={title} subtitle={subtitle} description={description} index={i} />
        ))}
      </div>
    </div>
  );
}

export default Sustainability;
