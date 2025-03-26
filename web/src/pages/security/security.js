import React from "react";
import "./security.css";
import vision from "../../images/icons/vision.png";
import whatwedo from "../../images/icons/route.png";

function Security() {
  return (
    <div className="security">
      <div className="security__title-container">
        <h2 className="security__title">
          <span className="highlightH2">Security</span>
        </h2>
      </div>

      <div className="security__text-container">
        <h3 className="security__subtitle">1. Infrastructure</h3>
        <p className="security__text security__text--margintop">
          Our servers are securely housed in multiple European data centers. In
          the event of any malfunctions, technicians are always available to
          tackle the problem immediately. Amazon Web Services' online
          infrastructure guarantees the security and confidentiality of our
          cloud services. Learn more about AWS cloud infrastructure security:
        </p>
        <ul className="security__list">
          <li>Our data is stored in two different data centers.</li>
          <li>
            In the event of malfunctions, Domits automatically switches to
            another data center.
          </li>
          <li>An uptime of 99.995%.</li>
        </ul>

        <h3 className="security__subtitle">2. Theft and Privacy</h3>
        <p className="security__text">
          Domits is fully committed to ensuring that your data is safe and
          protected from hackers. Each customer has their own, separate database
          at Domits, making it impossible for other users to access other
          people's data.
        </p>
        <ul className="security__list">
          <li>When using Domits, the connection is secured.</li>
          <li>It is impossible for outsiders to intercept data traffic.</li>
        </ul>

        <h3 className="security__subtitle">3. Back-ups</h3>
        <p className="security__text">
          At Domits, we do everything we can to ensure that our system is always
          operational and your data is always secured. Backups of the data are
          made daily so that nothing is ever lost. In the event of disruptions,
          all your data is stored securely and our team ensures that your
          account can be restored.
        </p>
        <ul className="security__list">
          <li>Guarantee against data loss</li>
          <li>Daily recovery of data up to six months ago</li>
          <li>Secure data backups</li>
        </ul>
      </div>

      <div className="security__factsbox">
        <div className="security__fact">
          <div className="security__fact-header">
            <p className="security__fact-title">Vision</p>
            <img className="security__fact-image" src={vision} alt="Vision" />
          </div>
          <p className="security__fact-subtitle">
            Securing your data is our highest priority.
          </p>
          <p className="security__fact-text">
            Our commitment to innovation and data protection keeps your
            information safe.
          </p>
        </div>

        <div className="security__fact">
          <div className="security__fact-header">
            <p className="security__fact-title">What We Do</p>
            <img
              className="security__fact-image"
              src={whatwedo}
              alt="What We Do"
            />
          </div>
          <p className="security__fact-subtitle">
            Constant vigilance and security measures.
          </p>
          <p className="security__fact-text">
            Learn more about how we innovate for your security{" "}
            <a className="ref" href="/travelinnovation">
              here
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default Security;
