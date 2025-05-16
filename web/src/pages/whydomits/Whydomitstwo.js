import React, { useContext } from "react";
import "./whydomits.css"; // Ensure this file contains the necessary CSS for your BEM classes.
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

      <div className="why-domits-bar" id="TopBar">
        <p><a href="#Guest" onClick={(e) => handleSmoothScroll(e, 'Guest')}>{whyDomitsContent.head.guest}</a></p>
        <p><a href="#Host" onClick={(e) => handleSmoothScroll(e, 'Host')}>{whyDomitsContent.head.guest}</a></p>
        <p><a href="#Devs" onClick={(e) => handleSmoothScroll(e, 'Devs')}>{whyDomitsContent.head.dev}</a></p>
        <p><a href="#Growth" onClick={(e) => handleSmoothScroll(e, 'Growth')}>{whyDomitsContent.head.growth}</a></p>
      </div>

      <article id="Guest" className="why-domits__title-text-container-guest">
  <div className="why-domits__flex-container guest">
    <div className="why-domits__section guest">
      <h4 className="why-domits__h3">{whyDomitsContent.forGuest.title}</h4>
    </div>
    <div className="why-domits__section guest">
      <h3>{whyDomitsContent.forGuest.accommodation.title}</h3>
      <p className="why-domits__p_guest">
        {whyDomitsContent.forGuest.accommodation.description}
      </p>
    </div>
    <div className="why-domits__section guest">
      <h3>{whyDomitsContent.forGuest.experience.title}</h3>
      <p className="why-domits__p_guest">
        {whyDomitsContent.forGuest.experience.description}
      </p>
    </div>
    <div className="why-domits__section guest">
      <h3>{whyDomitsContent.forGuest.amenities.title}</h3>
      <p className="why-domits__p_guest">
          {whyDomitsContent.forGuest.amenities.description}
      </p>
    </div>
    <div className="why-domits__section guest">
      <h3>{whyDomitsContent.forGuest.aiAssist.title}</h3>
      <p className="why-domits__p_guest">
          {whyDomitsContent.forGuest.aiAssist.description}
      </p>
    </div>
    <div className="why-domits__section guest">
      <h3>{whyDomitsContent.forGuest.costEffective.title}</h3>
      <p className="why-domits__p_guest">
          {whyDomitsContent.forGuest.costEffective.description}
      </p>
    </div>

    <div className="why-domits__section guest">
      <h3>{whyDomitsContent.forGuest.platform.title}</h3>
      <p className="why-domits__p_guest">
          {whyDomitsContent.forGuest.platform.description}
      </p>
    </div>
  </div>
</article>


<article id="Host" className="why-domits__title-text-container-host">
  <div className="why-domits__flex-container host">
    <div className="why-domits__section host">
      <h3 className="why-domits__h3">{whyDomitsContent.forHost.title}</h3>
    </div>
    <div className="why-domits__section host">
      <h3>{whyDomitsContent.forHost.fee.title}</h3>
      <p className="why-domits__p_host">
      {whyDomitsContent.forHost.fee.description}
      </p>
    </div>
    <div className="why-domits__section host">
      <h3>{whyDomitsContent.forHost.income.title}</h3>
      <p className="why-domits__p_host">
          {whyDomitsContent.forHost.income.description}
      </p>
    </div>
    <div className="why-domits__section host">
      <h3>{whyDomitsContent.forHost.platform.title}</h3>
      <p className="why-domits__p_host">
          {whyDomitsContent.forHost.platform.description}
      </p>
    </div>
    <div className="why-domits__section host">
      <h3>{whyDomitsContent.forHost.aiAssist.title}</h3>
      <p className="why-domits__p_host">
            {whyDomitsContent.forHost.aiAssist.description}
      </p>
    </div>
    <div className="why-domits__section host">
      <h3>{whyDomitsContent.forHost.flexibility.title}</h3>
      <p className="why-domits__p_host">
            {whyDomitsContent.forHost.flexibility.description}
      </p>
    </div>
    <div className="why-domits__section host">
      <h3>{whyDomitsContent.forHost.flexibility.title}</h3>
      <p className="why-domits__p_host">
          {whyDomitsContent.forHost.control.description}
      </p>
    </div>
    <div className="why-domits__section host">
      <h3>{whyDomitsContent.forHost.meetPeople.title}</h3>
      <p className="why-domits__p_host">
          {whyDomitsContent.forHost.meetPeople.description}
      </p>
    </div>
  </div>
</article>


<article id="Devs" className="why-domits__title-text-container-dev">
  <div className="why-domits__flex-container dev">
    <div className="why-domits__section dev">
      <h4 className="why-domits__h3">{whyDomitsContent.forDevs.title}</h4>
    </div>
    <div className="why-domits__section dev">
      <h3>{whyDomitsContent.forDevs.technology.title}</h3>
      <p className="why-domits__p_dev">
          {whyDomitsContent.forDevs.technology.description.split('\n').map((line, index) => (
                                <li key={index}>{line}</li>
                            ))}
      </p>
    </div>
    <div className="why-domits__section dev">
      <h3>{whyDomitsContent.forDevs.focusSecurity.title}</h3>
      <p className="why-domits__p_dev">
          {whyDomitsContent.forDevs.focusSecurity.description.split('\n').map((line, index) => (
                                        <li key={index}>{line}</li>
                                    ))}
      </p>
    </div>
    <div className="why-domits__section dev">
      <h3>{whyDomitsContent.forDevs.dataDriven.title}</h3>
      <p className="why-domits__p_dev">
          {whyDomitsContent.forDevs.dataDriven.description}
      </p>
    </div>
    <div className="why-domits__section dev">
      <h3>{whyDomitsContent.forDevs.collaborative.title}</h3>
      <p className="why-domits__p_dev">
            {whyDomitsContent.forDevs.collaborative.description.split('\n').map((line, index) => (
                                              <li key={index}>{line}</li>
                                          ))}
      </p>
    </div>
  </div>
</article>


<article id="Growth" className="why-domits__title-text-container-growth">
  <div className="why-domits__flex-container growth">
    <div className="why-domits__section growth">
      <h4 className="why-domits__h3">{whyDomitsContent.forGrowth.title}</h4>
    </div>
    <div className="why-domits__section growth">
      <h3>{whyDomitsContent.forGrowth.fastGrow.title}</h3>
      <p className="why-domits__p_growth">
          {whyDomitsContent.forGrowth.fastGrow.description}
      </p>
    </div>
    <div className="why-domits__section growth">
      <h3>{whyDomitsContent.forGrowth.innovative.title}</h3>
      <p className="why-domits__p_growth">
            {whyDomitsContent.forGrowth.innovative.description.split('\n').map((line, index) => (
                                              <li key={index}>{line}</li>
                                          ))}
      </p>
    </div>
    <div className="why-domits__section growth">
      <h3>{whyDomitsContent.forGrowth.dataDriven.title}</h3>
      <p className="why-domits__p_growth">
            {whyDomitsContent.forGrowth.dataDriven.description.split('\n').map((line, index) => (
                                              <li key={index}>{line}</li>
                                          ))}
      </p>
    </div>
    <div className="why-domits__section growth">
      <h3>{whyDomitsContent.forGrowth.collaborative.title}</h3>
      <p className="why-domits__p_growth">
            {whyDomitsContent.forGrowth.collaborative.description.split('\n').map((line, index) => (
                                              <li key={index}>{line}</li>
                                          ))}
      </p>
    </div>
  </div>
  <div className="navigation-arrows">
    <a href="#TopBar" onClick={(e) => handleSmoothScroll(e, 'TopBar')}>Back to Top</a>
  </div>
</article>
    </section>
  );
}

export default Whydomits;
