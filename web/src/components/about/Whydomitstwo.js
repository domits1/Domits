import React from "react";
import "./whydomits.css"; // Ensure this file contains the necessary CSS for your BEM classes.
import FAQ from "../landingpage/Faq";
import barchart from "../../images/icons/bar-chart.png";
import chartbreakout from "../../images/icons/chart-breakout-circle.png";

function Whydomits() {
  return (
    <section className="why-domits">
      <article className="why-domits__title-text-container">
        <h3 className="why-domits__h3">Why <span className="highlightText">Domits</span> & how we win together</h3>
        <h4 className="why-domits__h4">
          One of the fastest improving travel platforms.
        </h4>
        <p className="why-domits__p">
          Besides our resourceful traveltech network and talents, we are one of
          the fastest improving travel platforms. Although we only launched
          <span className="highlightText"> Domits</span> in late 2023, 
          we have been supporting travel companies to grow since 2015.
        </p>
        <p className="why-domits__p">
          Start your journey as a Guest or <span className="highlightText">Host</span> within minutes. List, search and
          book holiday accommodations, campers and boats. Save cost with our
          small system charges. There are no hidden costs or percentage cuts.
          Save administrative time. Make use of our global payment methods.
          Enjoy our warmhearted customer centric approach. Try it out for free.
        </p>
      </article>
      <section className="why-domits__cards-container">
        <article className="why-domits__card">
          <p className="why-domits__card-p">
            Our motto is 1% better every day in product development, integrations, security and intellectual travel leadership.
          </p>
          <img className="why-domits__image" src={barchart} alt="Bar Chart" />
        </article>
        <article className="why-domits__card">
          <p className="why-domits__card-p">
            Travel Innovation Labs to create sustainable value. For hosts to increase revenue, occupancy and rates. For Guests an AI trip planner with recommendations.
          </p>
          <img className="why-domits__image" src={chartbreakout} alt="Bar Chart" />
        </article>
      </section>
    </section>
  );
}

export default Whydomits;
