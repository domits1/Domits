import React from 'react';
import './helpdesk.css';
import FAQ from "../landingpage/Faq";

const Helpdesk = ({ onSearch }) => {


  return (
    <div className="helpContainer">
      <div className="helpSearchWrapper">
        <input
            type="text"
            placeholder="What do you need help with?"
            className="helpSearchInput"
        />
        <button type="submit" className="helpSearchButton">
            Search
        </button>
      </div>

        <div>
            <FAQ />
        </div>
    </div>
  );
};

export default Helpdesk;
