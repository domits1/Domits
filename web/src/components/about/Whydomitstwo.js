import React from "react";
import "./whydomits.css"; // Ensure this file contains the necessary CSS for your BEM classes.
import FAQ from "../landingpage/Faq";
import barchart from "../../images/icons/bar-chart.png";
import chartbreakout from "../../images/icons/chart-breakout-circle.png";

function Whydomits() {

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
        <h3 className="why-domits__h3">Why <span className="highlightText">Domits</span> & how we win together</h3>
        <h4 className="why-domits__h4">
        One of the fastest improving all-in-1 travel platforms.
        </h4>
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
        Travel Innovation Labs to create sustainable value. For hosts an AI-powered recommendations for growth, revenue, operations, and the guest experience to increase revenue, occupancy and rates. For guests an AI travel assistant with recommendations.
          </p>
          <img className="why-domits__image" src={chartbreakout} alt="Bar Chart" />
        </article>
      </section>

      <div className="why-domits-bar" id="TopBar">
        <p><a href="#Guest" onClick={(e) => handleSmoothScroll(e, 'Guest')}>Guest</a></p>
        <p><a href="#Host" onClick={(e) => handleSmoothScroll(e, 'Host')}>Host</a></p>
        <p><a href="#Devs" onClick={(e) => handleSmoothScroll(e, 'Devs')}>Dev, data and experts</a></p>
        <p><a href="#Growth" onClick={(e) => handleSmoothScroll(e, 'Growth')}>Growth, rev and ops experts</a></p>
      </div>

      <article id="Guest" className="why-domits__title-text-container-guest">
  <div className="why-domits__flex-container guest">
    <div className="why-domits__section guest">
      <h4 className="why-domits__h3">Why Domits for guest</h4>
    </div>
    <div className="why-domits__section guest">
      <h3>Unique Accommodations</h3>
      <p className="why-domits__p_guest">
        Unlike traditional hotels, Domits offers a variety of accommodation types, including apartments, houses, villas, campers and boats. This variety can cater to different tastes, needs, and experiences.
      </p>
    </div>
    <div className="why-domits__section guest">
      <h3>Local Experience</h3>
      <p className="why-domits__p_guest">
        Staying in a Domits accommodation often allows guests to immerse themselves more fully in local neighborhoods and cultures, giving them a more authentic experience than they might get from a hotel in a touristy area.
      </p>
    </div>
    <div className="why-domits__section guest">
      <h3>Amenities</h3>
      <p className="why-domits__p_guest">
        Many Domits rentals come with fully equipped kitchens, laundry facilities, and more space than a typical hotel room. This is especially beneficial for families, long-term guests, or those wanting to cook their own meals.
      </p>
    </div>
    <div className="why-domits__section guest">
      <h3>AI Travel Assistant</h3>
      <p className="why-domits__p_guest">
        Receive travel assistance for your next trip. Reduce time and cost with personalized recommendations for accommodations.
      </p>
    </div>
    <div className="why-domits__section guest">
      <h3>Cost-Effective</h3>
      <p className="why-domits__p_guest">
        Domits often provides more affordable options than hotels, especially for longer stays or for groups who can split the cost of larger properties. Guests can also find budget-friendly choices by renting a room in someone's home rather than an entire property.
      </p>
    </div>
  </div>
</article>


<article id="Host" className="why-domits__title-text-container-host">
  <div className="why-domits__flex-container host">
    <div className="why-domits__section host">
      <h3 className="why-domits__h3">Why Domits for host</h3>
    </div>
    <div className="why-domits__section host">
      <h3>0% host fee:</h3>
      <p className="why-domits__p_host">
      “0% host fee: Avoid paying platform fees and increase your revenue with our 0% host fee.”
      </p>
    </div>
    <div className="why-domits__section host">
      <h3>Extra Income</h3>
      <p className="why-domits__p_host">
        Many hosts rent out their homes, spare rooms, boats or campers as a way to earn additional income. This can be a great side hustle or even a full-time job in some cases.
      </p>
    </div>
    <div className="why-domits__section host">
      <h3>All-In-1-Platform</h3>
      <p className="why-domits__p_host">
        Centralized calendar, prices, reservations, messages, revenues, reviews, finance, channel management and property care.
      </p>
    </div>
    <div className="why-domits__section host">
      <h3>AI Assistant For Host</h3>
      <p className="why-domits__p_host">
        Save time, cost and headaches with our AI assistant for hosts. Boost performance with personalized AI-powered recommendations for growth, revenue, operations and the guest experience.
      </p>
    </div>
    <div className="why-domits__section host">
      <h3>Flexibility</h3>
      <p className="why-domits__p_host">
        Hosting on Domits gives people the opportunity to meet guests from different countries and cultures, which can be an enriching and rewarding experience.
      </p>
    </div>
    <div className="why-domits__section host">
      <h3>Control Over Listing</h3>
      <p className="why-domits__p_host">
        Hosts have control over the rules of their space, including check-in times, house rules, and guest preferences. Domits's platform also helps to screen guests through its review system, making hosting safer.
      </p>
    </div>
    <div className="why-domits__section host">
      <h3>Meet People from Around the World</h3>
      <p className="why-domits__p_host">
        Domits allows hosts to choose when to rent out their space, whether it's seasonally, occasionally, or full-time. They can also set their own pricing.
      </p>
    </div>
  </div>
</article>


<article id="Devs" className="why-domits__title-text-container-dev">
  <div className="why-domits__flex-container dev">
    <div className="why-domits__section dev">
      <h4 className="why-domits__h3">Why Domits for dev, data and sec experts</h4>
    </div>
    <div className="why-domits__section dev">
      <h3>Cutting-Edge Technology and Scale</h3>
      <p className="why-domits__p_dev">
        <li>Engineering Challenges: Domits intends to operate at a massive global scale with millions of users across different countries. Engineers get to work on large-scale, complex systems, optimizing for performance, reliability, and scalability.</li>
        <li>Modern Tech Stack: Domits uses React (Native) and AWS cloud infrastructure.</li>
        <li>Emphasis on Innovation: The company encourages innovation, giving engineers the freedom to explore new tools, frameworks, and technologies.</li>
        <li>IoT Hub: Experimentation with self check-in, smart locks, smart cameras, smart thermometers, noise monitoring and other smart home amenities.</li>
      </p>
    </div>
    <div className="why-domits__section dev">
      <h3>Focus on Security and Privacy</h3>
      <p className="why-domits__p_dev">
        <li>Security Challenges: With the intent of attracting millions of users and transactions, security is paramount at Domits. Security experts have the opportunity to tackle a broad range of security challenges such as securing payments, protecting user data, and preventing fraud and abuse. Domits’s focus on international expansion and regulatory compliance (e.g., GDPR) adds complexity, making security roles more interesting.</li>
        <li>Trust and Safety: Domits prioritizes trust and safety within its community. Security experts work on identity verification, detection of fraudulent listings, and abuse prevention systems.</li>
      </p>
    </div>
    <div className="why-domits__section dev">
      <h3>Data-Driven Culture</h3>
      <p className="why-domits__p_dev">
        Data Engineering & Analytics: Domits intends to be a highly data-driven company. It relies heavily on data to drive decision-making, product development, and user experience improvements.
      </p>
    </div>
    <div className="why-domits__section dev">
      <h3>Collaborative and Open Work Environment</h3>
      <p className="why-domits__p_dev">
        <li>Cross-functional: Engineers at Domits work closely with everyone. This cross-functional collaboration allows technical people to have a significant impact on product direction and company strategy.</li>
        <li>Open Culture: Domits promotes an open and transparent work culture where employees are encouraged to share ideas and opinions.</li>
      </p>
    </div>
  </div>
</article>


<article id="Growth" className="why-domits__title-text-container-growth">
  <div className="why-domits__flex-container growth">
    <div className="why-domits__section growth">
      <h4 className="why-domits__h3">Why Domits for growth, rev and ops experts</h4>
    </div>
    <div className="why-domits__section growth">
      <h3>Fast-Growing Travel Platform</h3>
      <p className="why-domits__p_growth">
        Massive Scale and Reach: Domits intends to operate in thousands of cities worldwide and being used by millions of hosts and guests. This scaling opportunity offers growth hackers and revenue experts unique opportunities to optimize user acquisition, engagement, and retention strategies.
      </p>
    </div>
    <div className="why-domits__section growth">
      <h3>Innovative Marketing Strategies</h3>
      <p className="why-domits__p_growth">
        <li>Growth Marketing: Domits intends to be known for its creative and viral marketing strategies. Growth hackers at Domits are empowered to experiment with bold ideas, leveraging data to drive customer acquisition through non-traditional and viral channels.</li>
        <li>Local and Global Campaigns: Domits's marketing spans both global and hyper-local strategies. Growth hackers and revenue experts have the opportunity to work on campaigns that range from local community building to international brand awareness efforts, offering a broad and varied range of challenges.</li>
      </p>
    </div>
    <div className="why-domits__section growth">
      <h3>Data-Driven Growth Culture</h3>
      <p className="why-domits__p_growth">
        <li>A/B Testing and Experimentation: Growth hackers can thrive at Domits because of its strong emphasis on experimentation and data-driven decision-making. The company runs A/B tests to continuously refine its platform, optimize conversion rates, and improve user engagement.</li>
        <li>Analytics and Personalization: Revenue experts can leverage Domits's data analytics platform to fine-tune pricing strategies, optimize revenue management, and personalize user experiences. Domits's marketplace dynamics require constant optimization of demand and supply, which provides revenue experts with complex, impactful challenges.</li>
      </p>
    </div>
    <div className="why-domits__section growth">
      <h3>Collaborative and Open Work Environment</h3>
      <p className="why-domits__p_growth">
        <li>Cross-functional: Engineers at Domits work closely with everyone. This cross-functional collaboration allows technical people to have a significant impact on product direction and company strategy.</li>
        <li>Open Culture: Domits promotes an open and transparent work culture where employees are encouraged to share ideas and opinions.</li>
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
