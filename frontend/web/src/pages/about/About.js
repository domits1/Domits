import React, { useContext } from "react";
import { Link } from "react-router-dom";
import {
  Globe,
  Users,
  Laptop,
  HandHeart,
  Rocket,
  TrendingUp,
  Heart,
  Briefcase,
  ArrowRight,
} from "lucide-react";

import stefan from "../../images/about-img/stefan.jpeg";
import Robert from "../../images/about-img/Robert.jpg";
import Chiel from "../../images/about-img/Chiel.png";

import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

const STAT_ICONS = { globe: Globe, users: Users, laptop: Laptop, handHeart: HandHeart };
const MEMBER_PHOTOS = [stefan, Robert, Chiel];

function About() {
  const { language } = useContext(LanguageContext);
  const content = contentByLanguage[language]?.about?.aboutPage ?? en.about.aboutPage;

  const { hero, team, stats, cards, join } = content;

  return (
    <div className="about-page">
      <section className="about-page__hero">
        <p className="about-page__eyebrow">{content.eyebrow}</p>
        <h1 className="about-page__hero-title">
          {hero.line1}
          <br />
          <span className="about-page__hero-highlight">{hero.highlight}</span>
        </h1>
      </section>

      <section className="about-page__team">
        <h2 className="about-page__team-title">{team.title}</h2>
        <p className="about-page__team-subtitle">{team.subtitle}</p>

        <div className="about-page__team-members">
          {team.members.map((member, index) => (
            <div className="about-page__member" key={member.name}>
              <div className="about-page__member-avatar">
                <img
                  className="about-page__member-photo"
                  src={MEMBER_PHOTOS[index]}
                  alt={member.name}
                  loading="lazy"
                />
              </div>
              <p className="about-page__member-name">{member.name}</p>
              <p className="about-page__member-role">{member.role}</p>
            </div>
          ))}

          <Link to="/team" className="about-page__member-more">
            {team.moreMembers}
          </Link>
        </div>
      </section>

      <section className="about-page__stats">
        {stats.map(({ icon, value, label }) => {
          const Icon = STAT_ICONS[icon] ?? Globe;
          return (
            <div className="about-page__stat" key={label}>
              <Icon className="about-page__stat-icon" size={32} strokeWidth={1.8} />
              <div className="about-page__stat-text">
                <p className="about-page__stat-value">{value}</p>
                <p className="about-page__stat-label">{label}</p>
              </div>
            </div>
          );
        })}
      </section>

      <section className="about-page__cards">
        <article className="about-page__card about-page__card--featured">
          <span className="about-page__card-icon">
            <Rocket size={24} strokeWidth={1.8} />
          </span>
          <h3 className="about-page__card-title">{cards.featured.title}</h3>
          <p className="about-page__card-description">{cards.featured.description}</p>
          <div className="about-page__card-tags">
            {cards.featured.tags.map((tag) => (
              <span className="about-page__tag about-page__tag--light" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </article>

        <article className="about-page__card">
          <span className="about-page__card-icon">
            <TrendingUp size={24} strokeWidth={1.8} />
          </span>
          <h3 className="about-page__card-title">{cards.partnerSuccess.title}</h3>
          <p className="about-page__card-description">{cards.partnerSuccess.description}</p>
          <Link to="/partner" className="about-page__card-link">
            {cards.partnerSuccess.link} <ArrowRight size={16} />
          </Link>
        </article>

        <article className="about-page__card">
          <span className="about-page__card-icon">
            <Heart size={24} strokeWidth={1.8} />
          </span>
          <h3 className="about-page__card-title">{cards.culture.title}</h3>
          <p className="about-page__card-description">{cards.culture.description}</p>
          <div className="about-page__card-tags">
            {cards.culture.tags.map((tag) => (
              <span className="about-page__tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </article>

        <article className="about-page__card">
          <span className="about-page__card-icon">
            <Briefcase size={24} strokeWidth={1.8} />
          </span>
          <h3 className="about-page__card-title">{cards.openPositions.title}</h3>
          <p className="about-page__card-description">{cards.openPositions.description}</p>
          <div className="about-page__card-tags">
            {cards.openPositions.tags.map((tag) => (
              <span className="about-page__tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </article>
      </section>

      <section className="about-page__join">
        <h2 className="about-page__join-title">{join.title}</h2>
        <p className="about-page__join-description">{join.description}</p>
        <div className="about-page__join-buttons">
          <Link to="/career" className="about-page__join-button about-page__join-button--primary">
            {join.viewRoles} <ArrowRight size={18} />
          </Link>
          <Link to="/contact" className="about-page__join-button about-page__join-button--secondary">
            {join.partner}
          </Link>
        </div>
      </section>
    </div>
  );
}

export default About;
