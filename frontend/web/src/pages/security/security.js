import React, { useContext } from "react";
import {
  ShieldCheck,
  Lock,
  RefreshCw,
  MapPin,
  Server,
  Shield,
  CloudUpload,
  CheckCircle,
  Settings,
  Headphones,
} from "lucide-react";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const ICON_SIZE = 28;

const BADGE_ICONS    = [ShieldCheck, Lock, RefreshCw, MapPin];
const SECTION_ICONS  = [Server, Shield, CloudUpload];
const FACT_ICONS     = [CheckCircle, Settings];

function Security() {
  const { language } = useContext(LanguageContext);
  const c = contentByLanguage[language]?.security;

  if (!c) return null;

  return (
    <div className="security">
      <div className="security__hero">
        <span className="security__label">{c.label}</span>
        <h1 className="security__title">
          {c.title}{" "}
          <span className="security__title--accent">{c.titleAccent}</span>
        </h1>
      </div>

      <div className="security__badges">
        {c.badges.map(({ title, subtitle }, i) => {
          const Icon = BADGE_ICONS[i];
          return (
            <div className="security__badge" key={title}>
              <div className="security__badge-icon">
                <Icon size={ICON_SIZE} />
              </div>
              <div>
                <p className="security__badge-title">{title}</p>
                <p className="security__badge-subtitle">{subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="security__sections">
        {c.sections.map(({ title, description, bullets }, i) => {
          const Icon = SECTION_ICONS[i];
          return (
            <div className="security__section-card" key={title}>
              <div className="security__section-icon">
                <Icon size={ICON_SIZE} />
              </div>
              <div className="security__section-content">
                <h2 className="security__section-title">{title}</h2>
                <p className="security__section-description">{description}</p>
                <ul className="security__section-list">
                  {bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <div className="security__factsbox">
        {c.facts.map(({ title, text }, i) => {
          const Icon = FACT_ICONS[i];
          return (
            <div className="security__fact" key={title}>
              <div className="security__fact-icon">
                <Icon size={ICON_SIZE} />
              </div>
              <p className="security__fact-title">{title}</p>
              <p className="security__fact-text">{text}</p>
            </div>
          );
        })}
      </div>

      <div className="security__cta">
        <div className="security__cta-left">
          <div className="security__cta-icon">
            <Headphones size={ICON_SIZE} />
          </div>
          <h3 className="security__cta-title">{c.cta.title}</h3>
        </div>
        <div className="security__cta-buttons">
          <a href="/contact" className="security__cta-btn security__cta-btn--outline">
            {c.cta.contactButton}
          </a>
          <a href="/how-it-works" className="security__cta-btn security__cta-btn--filled">
            {c.cta.learnMoreButton}
          </a>
        </div>
      </div>
    </div>
  );
}

export default Security;
