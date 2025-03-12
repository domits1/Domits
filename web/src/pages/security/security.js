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
        <h3 className="security__subtitle">Infrastructure</h3>
      </div>

      <div className="security__text-container">
        <p className="security__text security__text--margintop">Our servers are securely housed in multiple European data centers. In the event of any malfunctions, technicians are always available to tackle the problem immediately. Amazon Web Services' online infrastructure guarantees the security and confidentiality of our cloud services. Learn more about AWS cloud infrastructure security.
        Our data is stored in two different data centers. 
        In the event of malfunctions, Domits automatically switches to another data center. 
        An uptime of 99.995%.</p>
        <p className="security__text">...........</p>
        <p className="security__text security__text--margintop">
          Read more about{" "}
          <a className="ref" href="/how-it-works">
            ...........
          </a>{" "}
          ...........
          <a className="ref" href="/why-domits">
            {" "}
            ...........
          </a>
          .
        </p>
      </div>

      <div className="security__factsbox">
        <div className="security__fact">
          <div className="security__fact-header">
            <p className="security__fact-title">Vision</p>
            <img className="security__fact-image" src={vision} alt="Vision" />
          </div>
          <p className="security__fact-subtitle">...........</p>
          <p className="security__fact-text">...........</p>
        </div>

        <div className="security__fact">
          <div className="security__fact-header">
            <p className="security__fact-title">What we do</p>
            <img
              className="security__fact-image"
              src={whatwedo}
              alt="What we do"
            />
          </div>
          <p className="security__fact-subtitle">...........</p>
          <p className="security__fact-text">
            ...........
            <a className="ref" href="/travelinnovation">
              {" "}
              ...........
            </a>
            .
          </p>
        </div>
      </div>

      <div className="security__footer">
        <p className="security__footer-text">...........</p>
        <p className="security__footer-text">...........</p>
      </div>
    </div>
  );
}

export default Security;