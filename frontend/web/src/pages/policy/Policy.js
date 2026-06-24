import React, { useContext } from "react";
import {
  FiSearch,
  FiShield,
  FiDatabase,
  FiMessageSquare,
  FiTarget,
  FiShare2,
  FiRefreshCw,
  FiSettings,
  FiMail,
  FiBellOff,
  FiEyeOff,
  FiHelpCircle,
  FiCheckCircle,
} from "react-icons/fi";
import { FaCookieBite } from "react-icons/fa";
import PrivacyIllustration from "./PrivacyIllustration.js";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";
import ReactMarkDown from "react-markdown";

const contentByLanguage = {
  en,
  nl,
  de,
  es,
};

const Policy = () => {
  const { language } = useContext(LanguageContext);
  const policyContent = contentByLanguage[language]?.policy;

  if (!policyContent) {
    return null;
  }

  const [titleFirst, ...titleRest] = policyContent.title.split(" ");

  const sections = [
    { icon: FiDatabase, ...policyContent.collectedData.service },
    { icon: FiMessageSquare, ...policyContent.collectedData.communication },
    { icon: FaCookieBite, ...policyContent.cookies },
    { icon: FiTarget, ...policyContent.purpose },
    { icon: FiShare2, ...policyContent.parties },
    { icon: FiRefreshCw, ...policyContent.changes },
    { icon: FiSettings, ...policyContent.choices },
    { icon: FiMail, ...policyContent.newsletter },
    { icon: FiBellOff, ...policyContent.communication },
    { icon: FiEyeOff, ...policyContent.disable },
    { icon: FiHelpCircle, ...policyContent.questions },
  ];

  return (
    <div className="privacy-policy">
      <p className="privacy-policy__eyebrow">{policyContent.privacy.title}</p>
      <h1 className="privacy-policy__title">
        {titleFirst}{" "}
        <span className="privacy-policy__title-accent">
          {titleRest.join(" ")}
        </span>
      </h1>

      <div className="privacy-policy__search">
        <FiSearch size={20} aria-hidden="true" />
        <input
          type="text"
          placeholder="Search within privacy policy..."
          aria-label="Search within privacy policy"
        />
      </div>

      <section className="privacy-policy__overview">
        <div className="privacy-policy__overview-body">
          <span className="privacy-policy__badge">
            <FiShield size={22} />
          </span>
          <h2 className="privacy-policy__overview-heading">
            {policyContent.privacy.title}
          </h2>
          <ReactMarkDown>{policyContent.privacy.description}</ReactMarkDown>
        </div>
        <div className="privacy-policy__overview-art" aria-hidden="true">
          <PrivacyIllustration />
        </div>
      </section>

      <section className="privacy-policy__sections">
        {sections.map(({ icon: Icon, title, description }) => (
          <article key={title} className="privacy-policy__section">
            <span className="privacy-policy__section-icon">
              <Icon size={20} />
            </span>
            <div>
              <h3 className="privacy-policy__section-title">{title}</h3>
              <div className="privacy-policy__section-text">
                <ReactMarkDown>{description}</ReactMarkDown>
              </div>
            </div>
          </article>
        ))}
      </section>

      <p className="privacy-policy__footnote">
        <FiCheckCircle size={18} />
        Domits respects the privacy of all users of its site and ensures that the
        personal information you provide is treated confidentially.
      </p>
    </div>
  );
};

export default Policy;
