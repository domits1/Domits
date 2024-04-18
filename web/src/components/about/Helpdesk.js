import React from 'react';
import './helpdesk.css';
import FAQ from "../landingpage/Faq";

const Helpdesk = ({ onSearch }) => {


  return (
    <main className="helpContainer">
      <section className="helpSearchWrapper">
        <input
            type="text"
            placeholder="What do you need help with?"
            className="helpSearchInput"
        />
        <button type="submit" className="helpSearchButton">
            Search
        </button>
      </section>

        <article>
            <FAQ />
        </article>
    </main>
  );
};

export default Helpdesk;
