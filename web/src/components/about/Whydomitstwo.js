import React from "react";
import "./whydomits.css";
import FAQ from "../landingpage/Faq";
import barchart from "../../images/icons/bar-chart.png";

function Whydomits() {
  return (
    <section className="WhyDomitsTwoMain">
      <article className="WhyDomitsTwoTitleTextContainer">
        <h3 className="WhyDomitsTwoH3">Why Domits & how we win together</h3>
        <h4 className="WhyDomitsTwoH4">
          One of the fastest improving travel platforms.
        </h4>
        <p className="WhyDomitsTwoP">
          Besides our resourceful traveltech network and talents, we are one of
          the fastest improving travel platforms. Although we only launched
          Domits in late 2023, we have been supporting travel companies to grow
          since 2015.
        </p>
        <p className="WhyDomitsTwoP">
          Start your journey as a Guest or host within minutes. List, search and
          book holiday accommodations, campers and boats. Save cost with our
          small system charges. There are no hidden costs or percentage cuts.
          Save administrative time. Make use of our global payment methods.
          Enjoy our warmhearted customer centric approach. Try it out for free.
        </p>
      </article>
      <section className="WhyDomitsTwoCardsContainer">
        <article className="WhyDomitsTwoCard">
          <p className="WhyDomitsTwoCardP">
            Our motto is 1% better every day in product development, integrations, security and intellectual travel leadership.
          </p>
          <img className="factsImage" src={barchart} alt="Bar Chart" />
        </article>
        <article className="WhyDomitsTwoCard">
          <p className="WhyDomitsTwoCardP">
            Our motto is 1% better every day in product development, integrations, security and intellectual travel leadership.
          </p>
          <img className="factsImage" src={barchart} alt="Bar Chart" />
        </article>
      </section>
    </section>
  );
}

export default Whydomits;
