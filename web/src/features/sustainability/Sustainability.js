import React from "react";
import "./Sustainability.css";

const Sustainability = () => {
  return (
    <div className="sustainability">
      <h1>Sustainability</h1>
      <hr />
      <h2>Why choose Domits for sustainability?</h2>
      <hr />

      <section id={"sustainable-business"}>
        <h3>
          1. Sustainable <strong>Business</strong>
        </h3>
        <strong>Recycling plan with bins</strong>
        <p>
          Domits is starting out simple with making conscious decisions like
          choosing more energy-saving appliances and will continue to improve
          this 1% every day. With our food waste policy we don’t want to be to
          rigid and starting with a flexible recycling plan for glass, paper,
          plastic and organic. For biodiversity and ecosystems we’re aiming to
          eat more organic food, use Eco-friendly cleaning products and have
          paperless procedures.
        </p>
      </section>

      <hr />
      <section id={"sustainable-accommodations"}>
        <h3>
          2. Sustainable <strong>Accommodations</strong>
        </h3>
        <strong>Certification</strong>
        <p>
          Domits is actively focusing on onboarding hosts that are already
          sustainable. If they’re not yet, we’re supporting them step-by-step to
          increase awareness. At a certain point we want to give hosts
          certifications as a proof of sustainability with energy, waste,
          biodiversity, ecosystems, destinations and community.
        </p>
      </section>
      <hr />
      <section id={"sustainable-guest-experience"}>
        <h3>3. Sustainable Guest Experience</h3>
        <p>
          From the first touch point with Domits for guest we want to let them
          feel that they are traveling as sustainable as possible. Domits begins
          with having sustainability filters and a large overview of all
          eco-friendly amenities.
        </p>
        <br />
      </section>
      <hr />
    </div>
  );
};

export default Sustainability;
