import React, { useContext } from "react";
import './howitworksrework.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faCalendarAlt, faUser } from '@fortawesome/free-solid-svg-icons';
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

function Howitworks() {
    const {language} =  useContext(LanguageContext);
    const howItWorksContent = contentByLanguage[language]?.howItWorksContent;
    
    return (
        <section className="howitworks__main">
            <article className="howitworks__titles-container">
                <h3 className="howitworks__title">{howItWorksContent.title}</h3>
                <h5 className="howitworks__subtitle">{howItWorksContent.subtitle}</h5>
            </article>
            <article className="howitworks__section-title-container">
                <h3 className="howitworks__section-title">{howItWorksContent.guest.title}</h3>
            </article>
            <article className="howitworks__info-block howitworks__info-block--guests">
                <section className="howitworks__info-item howitworks__info-item--guests borderright">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">{howItWorksContent.guest.destination.title}</h3>
                        <FontAwesomeIcon icon={faSearch} fontSize={'1.7rem'} color="white" />
                    </div>
                    <p className="howitworks__info-text">{howItWorksContent.guest.destination.description}</p>
                </section>
                <section className="howitworks__info-item howitworks__info-item--guests">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">{howItWorksContent.guest.holiday.title}</h3>
                        <FontAwesomeIcon icon={faCalendarAlt} fontSize={'1.7rem'} color="white" />
                    </div>
                    <p className="howitworks__info-text">{howItWorksContent.guest.holiday.description}</p>
                </section>
                <section className="howitworks__info-item howitworks__info-item--guests borderleft">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">{howItWorksContent.guest.experience.title}</h3>
                        <FontAwesomeIcon icon={faUser} fontSize={'1.7rem'} color="white" />
                    </div>
                    <p className="howitworks__info-text">{howItWorksContent.guest.experience.description}</p>
                </section>
            </article>

            <article className="howitworks__section-title-container">
                <h3 className="howitworks__section-title">{howItWorksContent.host.title}</h3>
            </article>
            <article className="howitworks__info-block howitworks__info-block--hosts bluebackground">
                <section className="howitworks__info-item howitworks__info-item--hosts borderright">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">{howItWorksContent.host.rental.title}</h3>
                        <FontAwesomeIcon icon={faUser} fontSize={'1.7rem'} color="white" />
                    </div>
                    <p className="howitworks__info-text">{howItWorksContent.host.rental.description}</p>
                </section>
                <section className="howitworks__info-item howitworks__info-item--hosts">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">{howItWorksContent.host.getPaid.title}</h3>
                        <FontAwesomeIcon icon={faCalendarAlt} fontSize={'1.7rem'} color="white" />
                    </div>
                    <p className="howitworks__info-text">{howItWorksContent.host.getPaid.description}</p>
                </section>
                <section className="howitworks__info-item howitworks__info-item--hosts borderleft">
                    <div className="howitworks__info-header">
                        <h3 className="howitworks__info-title">{howItWorksContent.host.welcomeGuest.title}</h3>
                        <FontAwesomeIcon icon={faUser} fontSize={'1.7rem'} color="white" />
                    </div>
                    <p className="howitworks__info-text">{howItWorksContent.host.welcomeGuest.description}</p>
                </section>
            </article>


            <article className="howitworks__titles-container">
                <h3 className="howitworks__title">{howItWorksContent.feature.title}</h3>
                    <h4>{howItWorksContent.feature.subtitle}</h4> 

            <div className="HostContainer">
                    <div>
                        <p><span className="span">{howItWorksContent.feature.core}</span></p>
                        <p><span className="span">{howItWorksContent.feature.budles}</span>{howItWorksContent.feature.bundles2}</p>
                        <p><span className="span">{howItWorksContent.feature.support}</span>{howItWorksContent.feature.support2}</p> 
                    </div>  
                    </div>

                    <div className="Container">
                    <span className="span">{howItWorksContent.feature.pms}</span>
                    <p>{howItWorksContent.feature.listing}</p>
                    <p>{howItWorksContent.feature.calendar}</p>
                    <p>{howItWorksContent.feature.reservations}</p>
                    <p>{howItWorksContent.feature.messages}</p>
                    <p>{howItWorksContent.feature.revenues}</p>
                    <p>{howItWorksContent.feature.reviews}</p>
                    <p>{howItWorksContent.feature.finance}</p>
                    <br/>

                    <span className="span">{howItWorksContent.feature.communication}</span>
                    <p>{howItWorksContent.feature.inbox}</p>
                    <p>{howItWorksContent.feature.hostdash}</p>
                    <p>{howItWorksContent.feature.guestdash}</p>
                    <br/>


                    <span className="span">{howItWorksContent.feature.revManagement}</span>
                    <p>{howItWorksContent.feature.overview}</p>
                    <p>{howItWorksContent.feature.rates}</p>
                    <p>{howItWorksContent.feature.adr}</p>
                    <p>{howItWorksContent.feature.revPar}</p>
                    <br/>
                    <span className="span">{howItWorksContent.feature.operations}</span>
                    <p>{howItWorksContent.feature.reservation}</p>
                    <p>{howItWorksContent.feature.pricing}</p>
                    <p>{howItWorksContent.feature.housekeeping}</p>
                    <p>{howItWorksContent.feature.maintenance}</p>
                    <br/>
                    <span className="span">{howItWorksContent.feature.clientSupport}</span>
                    <p>{howItWorksContent.feature.faq}</p>
                    <p>{howItWorksContent.feature.email}</p>
                    <p>{howItWorksContent.feature.phone}</p>
                            

                    </div>
            </article>
            
        </section>
    );
}

export default Howitworks;
