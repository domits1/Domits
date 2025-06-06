import React, { useContext } from "react";
import huis from "../../images/til-hero.png";
import travel from "../../images/icons/Travel.png";
import './ninedots.css';
import { useNavigate, useLocation } from 'react-router-dom';
import {LanguageContext} from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = {
  en,
  nl,
  de,
  es,
};

function TravelInnovation() {
    const {language} = useContext(LanguageContext);
    const travelInnovationContent = contentByLanguage[language]?.travelInnovationLabs;
    return (
        <div>
            <div className="image-container" style={{ backgroundImage: `url(${huis})` }}>
                <h1 className="title">{travelInnovationContent.title}</h1>
                <h3 className="subtitle">{travelInnovationContent.description}</h3>
            </div>
            <div className="header-two">
                <div className="header-text">
                    <h2 className="text-h2">{travelInnovationContent.groups.flyWheel.title}</h2>
                    <p className="text-description">
                        {travelInnovationContent.groups.flyWheel.description}
                    </p>
                </div>
                <img className="travel-image" src={travel} alt="Scenic travel destination" />
            </div>
            <div className="travel-container">
                <div className="travel-item">
                    <h2 className="travel-subtitle">{travelInnovationContent.groups.finance.title}</h2>
                    <p>{travelInnovationContent.groups.finance.description}</p>
                </div>
                <div className="travel-item">
                    <h2 className="travel-subtitle">{travelInnovationContent.groups.business.title}</h2>
                    <p>{travelInnovationContent.groups.business.description}</p>
                </div>
                <div className="travel-item">
                    <h2 className="travel-subtitle">{travelInnovationContent.groups.dailyLife.title}</h2>
                    <p>{travelInnovationContent.groups.dailyLife.description}</p>
                </div>
            </div>
        </div>
    );
}

export default TravelInnovation;
