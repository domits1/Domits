import React, { useContext } from "react";
import { Recycle, Award, Leaf } from "lucide-react";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const ICON_SIZE = 28;
const SECTION_ICONS = [Recycle, Award, Leaf];

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
        {c.sections.map(({ title, subtitle, description }, i) => {
          const Icon = SECTION_ICONS[i];
          return (
            <div className="sustainability__section-card" key={title}>
              <div className="sustainability__section-icon">
                <Icon size={ICON_SIZE} />
              </div>
              <div className="sustainability__section-content">
                <div className="sustainability__section-heading">
                  <span className="sustainability__section-number">{i + 1}</span>
                  <h2 className="sustainability__section-title">{title}</h2>
                </div>
                {subtitle && (
                  <p className="sustainability__section-subtitle">{subtitle}</p>
                )}
                <p className="sustainability__section-description">{description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Sustainability;
