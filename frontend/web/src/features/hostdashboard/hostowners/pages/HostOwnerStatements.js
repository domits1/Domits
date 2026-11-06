import React, { useContext } from "react";
import { LanguageContext } from "../../../../context/LanguageContext";
import en from "../../../../content/en.json";
import nl from "../../../../content/nl.json";
import de from "../../../../content/de.json";
import es from "../../../../content/es.json";
import "../styles/HostOwnerStatements.scss";

const contentByLanguage = { en, nl, de, es };
const DEFAULT_LANGUAGE = "en";
const TITLE_ID = "host-owner-statements-title";

const HostOwnerStatements = () => {
  const { language } = useContext(LanguageContext);
  const activeLanguage = contentByLanguage[language]?.hostOwnerStatements ? language : DEFAULT_LANGUAGE;
  const t = contentByLanguage[activeLanguage].hostOwnerStatements;

  return (
    <div className="page-body host-owner-statements">
      <header className="host-owner-statements-header">
        <h2 id={TITLE_ID}>{t.title}</h2>
        <p>{t.description}</p>
      </header>

      <section className="host-owner-statements-empty" aria-labelledby={TITLE_ID}>
        <h3>{t.emptyTitle}</h3>
        <p>{t.emptyDescription}</p>
      </section>

      <p className="host-owner-statements-note">{t.payoutNote}</p>
    </div>
  );
};

export default HostOwnerStatements;
