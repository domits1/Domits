import React, { useContext } from "react";
import FAQ from "../landingpage/Faq";
import barchart from "../../images/icons/bar-chart.png";
import chartbreakout from "../../images/icons/chart-breakout-circle.png";
import {LanguageContext} from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = {
  en,
  nl,
  de,
  es,
};

function Whydomits() {
  const {language} = useContext(LanguageContext);
  const whyDomitsContent = contentByLanguage[language]?.whyDomits;
  const handleSmoothScroll = (e, targetId) => {
    e.preventDefault();
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      window.scrollTo({
        top: targetElement.offsetTop,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="why-domits">
      <article className="why-domits__title-text-container">
        <h3 className="why-domits__h3">{whyDomitsContent.head.title}</h3>
        <h4 className="why-domits__h4">
        {whyDomitsContent.head.subtitle}
        </h4>
        <p className="why-domits__p">
        {whyDomitsContent.head.description}
        </p>
        <p className="why-domits__p"><a className="ref" href="/landing">{whyDomitsContent.head.landing}</a>{whyDomitsContent.head.discover}<a className="ref" href="/how-it-works">{whyDomitsContent.head.howItworks}</a>{whyDomitsContent.head.readMore}<a className="ref" href="/about">{whyDomitsContent.head.aboutUs}</a>.</p>
      </article>
      <section className="why-domits__cards-container">
        <article className="why-domits__card">
          <p className="why-domits__card-p">
            {whyDomitsContent.head.ourMotto}
          </p>
          <img className="why-domits__image" src={barchart} alt="Bar Chart" />
        </article>
        <article className="why-domits__card">
          <p className="why-domits__card-p">
            {whyDomitsContent.head.travelInnovation}          
          </p>
          <img className="why-domits__image" src={chartbreakout} alt="Bar Chart" />
        </article>
      </section>
    </section>
  );
}

export default Whydomits;
