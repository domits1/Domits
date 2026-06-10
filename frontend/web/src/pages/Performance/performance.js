import React, { useContext } from "react";
import {
  House,
  BarChart2,
  Building2,
  Megaphone,
  Settings,
  TrendingUp,
  Heart,
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
        {c.sections.map(({ title, bullets }, i) => {
          const Icon = SECTION_ICONS[i];
          return (
            <div className="performance__section-card" key={title}>
              <div className="performance__section-icon">
                <Icon size={ICON_SIZE} />
              </div>
              <div className="performance__section-content">
                <div className="performance__section-heading">
                  <span className="performance__section-number">{i + 1}</span>
                  <h2 className="performance__section-title">{title}</h2>
                </div>
                <ul className="performance__section-list">
                  {bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Performance;
