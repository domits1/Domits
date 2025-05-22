import React, { useContext } from "react";
import '../disclaimers/disclaimers.css'
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

const Policy = () =>{
    const {language} =  useContext(LanguageContext);
    const policyContent = contentByLanguage[language]?.policy;
       
    return(
        <div className="policy">
            <h1>{policyContent.title}</h1>
            <input type="text" placeholder="Search within privacy policy..." />

            <h3>{policyContent.privacy.title}</h3>
            <ReactMarkDown>
                {policyContent.privacy.description}
            </ReactMarkDown>

            <h3>{policyContent.collectedData.title}</h3>
            <h4>{policyContent.collectedData.service.title}</h4>
            <p>
                {policyContent.collectedData.service.description}
            </p>
            <br />
            <h3>{policyContent.collectedData.communication.title}</h3>
            <br />
            <p>
                {policyContent.collectedData.communication.description}
            </p>

            <h3>{policyContent.cookies.title}</h3>
            <ReactMarkDown>
                {policyContent.cookies.description}
            </ReactMarkDown>
        
            <h3>{policyContent.purpose.title}</h3>
            <p>
                {policyContent.purpose.description}
            </p>

            <h3>{policyContent.parties.title}</h3>
            <p>
                {policyContent.parties.description}
            </p>

            <h3>{policyContent.changes.title}</h3>
            <p>
                {policyContent.changes.description}
            </p>

            <h3>{policyContent.choices.title}</h3>
            <p>
                {policyContent.choices.description}
            </p>

            <h3>{policyContent.newsletter.title}</h3>
            <p>
                {policyContent.newsletter.description}
            </p>

            <h3>{policyContent.communication.title}</h3>
            <p>
                {policyContent.communication.description}
            </p>

            <h3>{policyContent.disable.title}</h3>
            <p>
                {policyContent.disable.description}
            </p>

            <h3>{policyContent.questions.title}</h3>
            <p>
                {policyContent.questions.description}
            </p>            

        </div>
    );
}

export default Policy;
