import React, { useContext } from "react";
import './disclaimers.css'
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

const Disclaimer = () =>{
    const {language} =  useContext(LanguageContext);
    const disclaimerContent = contentByLanguage[language]?.disclaimer;

    return(

        <div className="disclaimers">
            <h1>{disclaimerContent.title}</h1>
            <br />
            <input type="text" placeholder="Search within disclaimer..." />

            <h3>{disclaimerContent.subtitle}</h3>
            <p>{disclaimerContent.date}</p>
            <h3>{disclaimerContent.definitions.title}</h3>
            <ReactMarkDown>
                {disclaimerContent.definitions.description}
            </ReactMarkDown>
            <h3>{disclaimerContent.copyright.title}</h3>
            <p>
                {disclaimerContent.copyright.description}
            </p>
            </div>
    );
}

export default Disclaimer;