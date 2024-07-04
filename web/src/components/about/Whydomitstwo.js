import React from "react";
import "./whydomits.css";
import FAQ from "../landingpage/Faq";
import barchart from "../../images/icons/bar-chart.png";
import chartbreakout from "../../images/icons/chart-breakout-circle.png";
import check from "../../images/icons/check.png";

function Whydomits() {
  return (
    <section className="WhyDomitsTwoMain">
      <article className="WhyDomitsTwoTitleTextContainer">
        <h3 className="WhyDomitsTwoH3">Why Choose Domits? How We Succeed Together</h3>
        <h5 className="WhyDomitsTwoH4">
          One of the fastest-growing travel platforms
        </h5>
        <p className="WhyDomitsTwoP">
          Leveraging our extensive travel tech network and talent, we are proud to be one of the 
          fastest-growing travel platforms. Although Domits was launched in late 2023, we have been 
          supporting the growth of travel companies since 2015.
        </p>
        <p className="WhyDomitsTwoP">
          <h4>Join Us: Host or Guest</h4>
          <p><img src={check} alt="check"/>Start your journey as a guest or host in minutes. </p>
          <p><img src={check} alt="check"/>Easily list, search, and book holiday accommodations, campers, and boats. Save costs with our minimal system charges. </p>
          <p><img src={check} alt="check"/>Enjoy no hidden costs or percentage cuts, and save administrative time with our global payment methods. </p>
          <p><img src={check} alt="check"/>Experience our warm, customer-centric approach. Try it out for free.</p>
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
          Travel Innovation Labs to create sustainable value. For hosts to increase revenue, occupancy and rates. For Guests an AI trip planner with recommendations.
          </p>
          <img className="factsImage" src={chartbreakout} alt="Bar Chart" />
        </article>
      </section>
    </section>
  );
}

export default Whydomits;
