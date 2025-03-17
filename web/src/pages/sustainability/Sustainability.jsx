import React from "react";
import "../disclaimers/disclaimers.css";

const Terms = () => {
  return (
    <div className="sustainability">
      <h1>Sustainability</h1>
      <hr />
      <input type="text" placeholder="Search within this page..." />
      <br />
      <h2>Why choose Domits for sustainability?</h2>
      <h2>Our goals</h2>
      <hr />

      <h3>
        1. Sustainable <span className="bold">Business</span>
      </h3>
      <span className="bold">Recycling plan with bins</span>
      <p>
        Domits is starting out simple with making conscious decisions like
        choosing more energy-saving appliances and will continue to improve this
        1% every day. With our food waste policy we don’t want to be to rigid
        and starting with a flexible recycling plan for glass, paper, plastic
        and organic. For biodiversity and ecosystems we’re aiming to eat more
        organic food, use Eco-friendly cleaning products and have paperless
        procedures.
      </p>
      <hr />
      <h3>
        2. Sustainable <span className="bold">Accommodations</span>
      </h3>
      <span className="bold">Certification</span>
      <p>
        Domits is actively focusing on onboarding hosts that are already
        sustainable. If they’re not yet, we’re supporting them step-by-step to
        increase awareness. At a certain point we want to give hosts
        certifications as a proof of sustainability with energy, waste,
        biodiversity, ecosystems, destinations and community.
      </p>
      <hr />
      <h3>3. Sustainable Guest Experience.</h3>
      <p>
        From the first touch point with Domits for guest we want to let them
        feel that they are traveling as sustainable as possible. Domits begins
        with having sustainability filters and a large overview of all
        eco-friendly amenities.
      </p>
      <br />
      <hr></hr>
    </div>
  );
};

export default Terms;
