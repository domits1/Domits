import React, { useContext } from "react";
import {
  Search,
  Calendar,
  MessageSquare,
  Home,
  DollarSign,
} from "lucide-react";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const GUEST_ICONS = [Search, Calendar, MessageSquare];
const HOST_ICONS = [Home, Calendar, DollarSign];

function Howitworks() {
  const { language } = useContext(LanguageContext);
  const content =
    contentByLanguage[language]?.howItWorksContent?.redesign ??
    en.howItWorksContent.redesign;

  const { guests, hosts } = content;

  const renderSection = (section, icons, variant) => (
    <section className={`how-it-works__section how-it-works__section--${variant}`}>
      <div className="how-it-works__section-intro">
        <p className="how-it-works__eyebrow">{section.eyebrow}</p>
        <h2 className="how-it-works__heading">{section.heading}</h2>
      </div>

      <div className="how-it-works__steps">
        {section.steps.map((step, index) => {
          const Icon = icons[index];
          return (
            <article className="how-it-works__card" key={step.title}>
              <span className="how-it-works__card-number">{index + 1}</span>
              <span className="how-it-works__card-icon">
                <Icon size={24} strokeWidth={1.8} />
              </span>
              <h3 className="how-it-works__card-title">{step.title}</h3>
              <p className="how-it-works__card-text">{step.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );

  return (
    <div className="how-it-works">
      <section className="how-it-works__hero">
        <p className="how-it-works__hero-eyebrow">{content.eyebrow}</p>
        <h1 className="how-it-works__hero-title">
          {content.heroStart}
          <span className="how-it-works__hero-highlight">{content.heroHighlight}</span>
        </h1>
      </section>

      {renderSection(guests, GUEST_ICONS, "guests")}
      {renderSection(hosts, HOST_ICONS, "hosts")}
    </div>
  );
}

export default Howitworks;
