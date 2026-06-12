import React, { useContext } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  ShieldCheck,
  Headphones,
  Zap,
  Wrench,
  CreditCard,
  Sparkles,
  Leaf,
  Earth,
  Heart,
  Star,
  ArrowRight,
  Home,
  BarChart3,
  KeyRound,
  RefreshCw,
} from "lucide-react";

import stefan from "../../images/about-img/stefan.jpeg";
import tim from "../../images/about-img/tim.png";
import Robert from "../../images/about-img/Robert.jpg";
import Denisa from "../../images/about-img/Denisa.jpeg";

import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

function About() {
  const { language } = useContext(LanguageContext);
  const content = contentByLanguage[language]?.about?.redesign;

  if (!content) return null;

  const features = [
    { icon: Users, label: content.features.fairHosts },
    { icon: ShieldCheck, label: content.features.securePayments },
    { icon: Headphones, label: content.features.humanSupport },
    { icon: Zap, label: content.features.aiTools },
  ];

  const pills = [
    { icon: Zap, label: content.pills.instantBooking },
    { icon: Wrench, label: content.pills.smartTools },
    { icon: CreditCard, label: content.pills.securePayments },
  ];

  const techItems = [
    { icon: Sparkles, label: content.techBand.aiTools },
    { icon: Users, label: content.techBand.humanSupport },
    { icon: Leaf, label: content.techBand.sustainableTravel },
  ];

  const stats = [
    { icon: Earth, value: content.stats.countriesValue, label: content.stats.countriesLabel },
    { icon: Heart, value: content.stats.guestsValue, label: content.stats.guestsLabel },
    { icon: Star, value: content.stats.ratingValue, label: content.stats.ratingLabel },
  ];

  const orbitMembers = [
    { src: stefan, alt: "Stefan", position: "top-left", badge: Home },
    { src: Robert, alt: "Robert", position: "top-right", badge: BarChart3 },
    { src: Denisa, alt: "Denisa", position: "bottom-left", badge: KeyRound },
    { src: tim, alt: "Tim", position: "bottom-right", badge: RefreshCw },
  ];

  return (
    <div className="about">
      <section className="about__hero">
        <p className="about__eyebrow">{content.eyebrow}</p>
        <h1 className="about__hero-title">
          {content.hero.line1}
          <br />
          {content.hero.line2}
          <span className="about__hero-highlight">{content.hero.highlight}</span>
          {content.hero.suffix}
        </h1>

        <div className="about__features">
          {features.map(({ icon: Icon, label }) => (
            <div className="about__feature" key={label}>
              <div className="about__feature-icon">
                <Icon size={28} strokeWidth={1.8} />
              </div>
              <p className="about__feature-label">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about__mission">
        <div className="about__mission-text">
          <p className="about__mission-label">{content.mission.label}</p>
          <h2 className="about__mission-title">
            {content.mission.titleStart}
            <span className="about__mission-highlight">{content.mission.titleHighlight}</span>
            {content.mission.titleEnd}
          </h2>
          <p className="about__mission-description">{content.mission.description}</p>
          <Link to="/how-it-works" className="about__mission-cta">
            {content.mission.cta} <ArrowRight size={18} />
          </Link>
          <Link to="/team" className="about__mission-team-link">
            {content.mission.meetTheTeam} <ArrowRight size={16} />
          </Link>
        </div>

        <div className="about__mission-visual">
          <div className="about__orbit">
            <Earth className="about__orbit-globe" strokeWidth={0.6} />
            {orbitMembers.map(({ src, alt, position, badge: Badge }) => (
              <div className={`about__orbit-member about__orbit-member--${position}`} key={alt}>
                <img className="about__orbit-photo" src={src} alt={alt} loading="lazy" />
                <span className="about__orbit-badge">
                  <Badge size={14} strokeWidth={2} />
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="about__effortless">
        <p className="about__effortless-text">{content.effortless}</p>
        <div className="about__pills">
          {pills.map(({ icon: Icon, label }) => (
            <div className="about__pill" key={label}>
              <Icon size={20} strokeWidth={1.8} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="about__tech-band">
        <h2 className="about__tech-title">{content.techBand.title}</h2>
        <div className="about__tech-items">
          {techItems.map(({ icon: Icon, label }) => (
            <div className="about__tech-item" key={label}>
              <Icon size={32} strokeWidth={1.6} />
              <p>{label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="about__stats">
        {stats.map(({ icon: Icon, value, label }) => (
          <div className="about__stat" key={label}>
            <Icon className="about__stat-icon" size={40} strokeWidth={1.6} />
            <div className="about__stat-text">
              <p className="about__stat-value">{value}</p>
              <p className="about__stat-label">{label}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="about__cta-band">
        <h2 className="about__cta-title">{content.cta.title}</h2>
        <div className="about__cta-buttons">
          <Link to="/home" className="about__cta-button about__cta-button--primary">
            {content.cta.explore} <ArrowRight size={18} />
          </Link>
          <Link to="/landing" className="about__cta-button about__cta-button--secondary">
            {content.cta.list}
          </Link>
        </div>
      </section>
    </div>
  );
}

export default About;
