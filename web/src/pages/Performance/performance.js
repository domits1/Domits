import React from "react";
import "./performance.css";

function Performance() {
  return (
    <div className="performance">
      <div className="performance__title-container">
        <h2 className="performance__title">
          <span className="highlightH2">Performance Bundles</span>
        </h2>
        <p className="performance__description">
          Our performance team loves to help you start, grow and scale in your
          short-term rental journey. It doesn’t matter if you use Domits or
          other tools. We're ready to increase revenue, reduce workload, and
          deliver beautiful experiences.
        </p>
      </div>

      <div className="performance__categories">
        <p className="performance__category">
          Starting host 1-9 properties | Growing host 10-99 properties | Scaling
          host 100+ properties
        </p>
      </div>

      <div className="performance__section">
        <h3 className="performance__subtitle">1. Distribution & Marketing</h3>
        <ul className="performance__list">
          <li>
            Channel management for distribution with Booking.com, Airbnb, VRBO,
            and 100+ channels.
          </li>
          <li>
            AI, data, and intelligence with analytics, dashboards, and
            measurement plans.
          </li>
          <li>
            Inbound marketing with lead generation, lead nurturing, customer
            journeys, community, and content.
          </li>
          <li>Performance marketing with SEO, SEA, CRO, and user tracking.</li>
          <li>
            Marketing automation and CRM with engagement, e-mail marketing, user
            segments, and communication flows.
          </li>
        </ul>
      </div>

      <div className="performance__section">
        <h3 className="performance__subtitle">2. Streamline Operations</h3>
        <ul className="performance__list">
          <li>Automate property management</li>
          <li>Reservation management</li>
          <li>Rate management</li>
          <li>Housekeeping</li>
          <li>Front desk</li>
          <li>Reporting</li>
        </ul>
      </div>

      <div className="performance__section">
        <h3 className="performance__subtitle">3. Grow Revenue</h3>
        <ul className="performance__list">
          <li>Dynamic pricing</li>
          <li>Digital upselling</li>
          <li>Occupancy rates</li>
          <li>ADR (Average Daily Rate)</li>
          <li>RevPAR (Revenue per Available Room)</li>
        </ul>
      </div>

      <div className="performance__section">
        <h3 className="performance__subtitle">4. Guest Experience</h3>
        <ul className="performance__list">
          <li>Warmth and friendliness</li>
          <li>Booking engine</li>
          <li>Messaging</li>
          <li>Reviews</li>
          <li>Check-in</li>
          <li>Support (FAQ, email, and phone)</li>
        </ul>
      </div>
    </div>
  );
}

export default Performance;
