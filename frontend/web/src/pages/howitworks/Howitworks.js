import React, { useContext } from "react";
import {
  Search,
  Calendar,
  MessageSquare,
  Home,
  DollarSign,
  MapPin,
  Check,
  Plus,
} from "lucide-react";
import { LanguageContext } from "../../context/LanguageContext.js";
import guestsSuitcase from "../../images/howitworks/guests-suitcase.png";
import hostsLaptop from "../../images/howitworks/hosts-laptop.png";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const GUEST_ICONS = [Search, Calendar, MessageSquare];
const HOST_ICONS = [Home, Calendar, DollarSign];

const SECTION_ILLUSTRATIONS = {
  guests: { src: guestsSuitcase, alt: "Suitcase, hat and plant" },
  hosts: { src: hostsLaptop, alt: "Domits host dashboard on a laptop" },
};

const CALENDAR_CELLS = Array.from({ length: 14 }, (_, i) => ({
  id: `cell-${i}`,
  active: i === 5,
}));
const REVENUE_BAR_HEIGHTS = [40, 55, 50, 70, 80, 95];

const MOCKUPS = {
  guests: [
    // Search bar
    <div className="how-it-works__mockup how-it-works__mockup--search" key="g0">
      <MapPin className="how-it-works__mockup-pin" size={14} />
      <span className="how-it-works__mockup-line" />
      <span className="how-it-works__mockup-search">
        <Search size={14} />
      </span>
    </div>,
    // Booking confirmation row
    <div className="how-it-works__mockup how-it-works__mockup--booking" key="g1">
      <span className="how-it-works__mockup-thumb" />
      <span className="how-it-works__mockup-lines">
        <span className="how-it-works__mockup-bar" />
        <span className="how-it-works__mockup-bar how-it-works__mockup-bar--short" />
      </span>
      <span className="how-it-works__mockup-check">
        <Check size={14} strokeWidth={3} />
      </span>
    </div>,
    // Chat bubbles
    <div className="how-it-works__mockup how-it-works__mockup--chat" key="g2">
      <span className="how-it-works__mockup-msg">
        <span className="how-it-works__mockup-avatar" />
        <span className="how-it-works__mockup-bubble" />
      </span>
      <span className="how-it-works__mockup-msg">
        <span className="how-it-works__mockup-avatar how-it-works__mockup-avatar--alt" />
        <span className="how-it-works__mockup-bubble how-it-works__mockup-bubble--short" />
      </span>
    </div>,
  ],
  hosts: [
    // Photo grid
    <div className="how-it-works__mockup how-it-works__mockup--gallery" key="h0">
      <span className="how-it-works__mockup-photo" />
      <span className="how-it-works__mockup-photo" />
      <span className="how-it-works__mockup-photo how-it-works__mockup-photo--add">
        <Plus size={16} strokeWidth={2.5} />
      </span>
    </div>,
    // Calendar grid
    <div className="how-it-works__mockup how-it-works__mockup--calendar" key="h1">
      {CALENDAR_CELLS.map((cell) => (
        <span
          className={`how-it-works__mockup-cell${cell.active ? " how-it-works__mockup-cell--active" : ""}`}
          key={cell.id}
        />
      ))}
    </div>,
    // Revenue bars
    <div className="how-it-works__mockup how-it-works__mockup--revenue" key="h2">
      <span className="how-it-works__mockup-amount">$12,750</span>
      <span className="how-it-works__mockup-bars">
        {REVENUE_BAR_HEIGHTS.map((h) => (
          <span className="how-it-works__mockup-col" style={{ height: `${h}%` }} key={`bar-${h}`} />
        ))}
      </span>
    </div>,
  ],
};

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
        <img
          className="how-it-works__illustration"
          src={SECTION_ILLUSTRATIONS[variant].src}
          alt={SECTION_ILLUSTRATIONS[variant].alt}
          loading="lazy"
        />
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
              {MOCKUPS[variant][index]}
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
