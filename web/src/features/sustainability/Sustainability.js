import React, { useContext } from "react";
import "./Sustainability.css";
import {submitAccommodation} from "../hostonboarding/services/SubmitAccommodation";
import {LanguageContext} from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";
import ReactMarkDown from "react-markdown";

const contentByLanguage = {
  en,
  nl,
  de,
  es,
};

const Sustainability = () => {
  const {language} =  useContext(LanguageContext);
  const sustainabilityContent = contentByLanguage[language]?.sustainability;

    return (
        <div className="sustainability">
            <h1>{sustainabilityContent.title}</h1>
            <hr/>
            <h2>{sustainabilityContent.subtitle}</h2>
            <hr/>

            <section id="sustainable-business">
                <h3>
                <ReactMarkDown>{sustainabilityContent.business.title}</ReactMarkDown>
                </h3>
                <strong>{sustainabilityContent.business.subtitle}</strong>
                <p>
                    {sustainabilityContent.business.description}
                </p>
            </section>

            <hr/>
            <section id="sustainable-accommodations">
                <h3>
                    <ReactMarkDown>{sustainabilityContent.accommodations.title}</ReactMarkDown>
                </h3>
                <strong>{sustainabilityContent.accommodations.subtitle}</strong>
                <p>
                   {sustainabilityContent.accommodations.description}
                </p>
            </section>
            <hr/>
            <section id="sustainable-guest-experience">
                <h3>
                    <ReactMarkDown>{sustainabilityContent.experience.title}</ReactMarkDown>
                </h3>
                <p>
                    {sustainabilityContent.experience.description}
                </p>

            </section>
            <hr/>
        </div>
    );
};

export default Sustainability;
