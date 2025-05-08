import React, { useContext } from "react";
import './about.css';
import vision from '../../images/icons/vision.png';
import whatwedo from '../../images/icons/route.png';
import stefan from '../../images/about-img/stefan.jpeg';
import tim from '../../images/about-img/tim.png';
import muhammed from '../../images/about-img/Muhammed.png';
import standard from '../../images/standard.png';
import nick from '../../images/nick.png';
import Ales from '../../images/about-img/Ales.jpg';
import Chant from '../../images/about-img/Chant.jpg';
import Justin from '../../images/about-img/Justin.jpg';
import Robert from '../../images/about-img/Robert.jpg';
import Robin from '../../images/about-img/Robin.jpg';
import Roozbeh from '../../images/about-img/Roozbeh.jpg';
import Sam from '../../images/about-img/Sam.jpg';
import Jared from '../../images/about-img/Jared.jpg';
import Ryan from '../../images/about-img/Ryan-compressed.png';
import Santosh from '../../images/about-img/Santosh.png';
import Sander from '../../images/about-img/Sander.png';
import Bekir from '../../images/about-img/Bekir.png';
import Kacper from '../../images/about-img/Kacper.png';
import Etka from '../../images/about-img/Etka.jpg';
import Sebastiaan from '../../images/about-img/Sebastiaan.png';
import Raman from '../../images/about-img/Raman.jpg';
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

// Handy tool for editing the images:
// https://imageresizer.com/image-compressor

function About() {
    const {language} = useContext(LanguageContext);
    const aboutContent = contentByLanguage[language]?.about;

    return (
        <div className="about">
            <div className="about__title-container">
                <h2 className="about__title"><span className="highlightH2">{aboutContent.title}</span></h2>
                <h3 className="about__title">{aboutContent.description}</h3>
            </div>
            <div className="about__subtitle-container">
                <h4>{aboutContent.mission.title}</h4>
            </div>

            <div className="about__text-container">
                <p className="about__text about__text--margintop">
                   {aboutContent.mission.description}
                </p>

                <p className="about__text about__text--margintop">
                    {aboutContent.mission.readHere}<a className="ref" href="/how-it-works">{aboutContent.mission.howItWorks}</a>{aboutContent.mission.and}<a
                    className="ref" href="/why-domits">{aboutContent.mission.whyDomits}</a>.
                </p>
            </div>
            <br/>
            <div className="about__factsbox">
                <div className="about__fact">
                    <div className="about__fact-header">
                        <p className="about__fact-title">{aboutContent.vision.title}</p>
                        <img className="about__fact-image" src={vision} alt="Vision"/>
                    </div>
                    <p className="about__fact-subtitle">{aboutContent.vision.subTitle}</p>
                    <p className="about__fact-text">
                        {aboutContent.vision.description}
                    </p>
                </div>
                <div className="about__fact">
                    <div className="about__fact-header">
                        <p className="about__fact-title">{aboutContent.whatWeDo.title}</p>
                        <img className="about__fact-image" src={whatwedo} alt="What we do"/>
                    </div>
                    <p className="about__fact-subtitle">{aboutContent.whatWeDo.subTitle}</p>
                    <p className="about__fact-text">
                        {aboutContent.whatWeDo.description}<a className="ref" href="/travelinnovation">{aboutContent.whatWeDo.travelInnovation}</a>.
                    </p>
                </div>
            </div>

            <div className="about__crew">
                <h1 className="about__who-we-are-title about__who-we-are-title--margintop">Who we are</h1>
                <p className="about__who-we-are-subtitle about__who-we-are-subtitle--marginbottom">We are all conscious
                    founders.</p>

                <div className="about__team">
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={stefan} alt="Stefan Hopman"/>
                        </div>
                        <p className="about__member-name">Stefan</p>
                        <p className="about__member-role">Founder</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={Robert} alt="Robert Hopman"/>
                        </div>
                        <p className="about__member-name">Robert</p>
                        <p className="about__member-role">Engineering Manager</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={tim} alt="Tim Hart"/>
                        </div>
                        <p className="about__member-name">Tim H.</p>
                        <p className="about__member-role">Product Owner</p>
                    </div>

                    {[
                        {name: 'Ales', src: Ales, role: 'Developer'},
                        {name: 'Bekir', src: Bekir, role: 'Developer'},
                        {name: 'Chant', src: Chant, role: 'Developer'},
                        {name: 'Etka', src: Etka, role: 'Developer'},
                        {name: 'Fejsal', src: standard, role: 'Developer'},
                        {name: 'Hamza H.', src: standard, role: 'Developer AI Agents'},
                        {name: 'Hamza Z.', src: standard, role: 'Developer'},
                        {name: 'Justin', src: Justin, role: 'Developer Distribution'},
                        {name: 'Kacper', src: Kacper, role: 'Developer'},
                        {name: 'Martijn', src: standard, role: 'Developer'},
                        {name: 'Mortada', src: standard, role: 'Developer Revenue'},
                        {name: 'Mohamed', src: muhammed, role: 'Developer'},
                        {name: 'Muhammed', src: muhammed, role: 'Developer'},
                        {name: 'Nick Ryan', src: nick, role: 'Developer'},
                        {name: 'Randy', src: standard, role: 'Developer Distribution'},
                        {name: 'Raman', src: standard, role: 'Developer'},
                        {name: 'Robin', src: Robin, role: 'Security'},
                        {name: 'Roozbeh', src: Roozbeh, role: 'Developer Revenue'},
                        {name: 'Ryan', src: Ryan, role: 'Developer'},
                        {name: 'Sam', src: Sam, role: 'Developer'},
                        {name: 'Santosh', src: Santosh, role: 'Developer'},
                        {name: 'Sander', src: Sander, role: 'Developer'},
                        {name: 'Sebastiaan', src: Sebastiaan, role: 'Developer'},
                        {name: 'Sem', src: standard, role: 'Developer'},
                    ]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((member) => (
                            <div className="about__member" key={member.name}>
                                <div className="about__avatar">
                                    <img className="about__avatar-image" src={member.src} alt={member.name}/>
                                </div>
                                <p className="about__member-name">{member.name}</p>
                                <p className="about__member-role">{member.role}</p>
                            </div>
                        ))}
                </div>

                <h2>Marketing</h2>
                <div className="about__team">
                    {[
                        {name: 'Jared', src: Jared, role: 'Growth'},
                        {name: 'Lisa', src: standard, role: 'Growth'},
                        {name: 'Maroan', src: standard, role: 'Growth'},
                        {name: 'Santiago', src: standard, role: 'Growth'},
                        {name: 'Thijmen', src: standard, role: 'Growth'},
                        {name: 'Vic', src: standard, role: 'Growth'},
                    ]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((member) => (
                            <div className="about__member" key={member.name}>
                                <div className="about__avatar">
                                    <img className="about__avatar-image" src={member.src} alt={member.name}/>
                                </div>
                                <p className="about__member-name">{member.name}</p>
                                <p className="about__member-role">{member.role}</p>
                            </div>
                        ))}

                    {[...Array(3)].map((_, i) => (
                        <div className="about__member" key={`hiring-${i}`}>
                            <div className="about__avatar">
                                <img className="about__avatar-image" src={standard} alt="This can be you!"/>
                            </div>
                            <p className="about__member-name">This can be you!</p>
                            <p className="about__member-role">We're hiring!</p>
                        </div>
                    ))}

                </div>
                <div className="about__footer">
                    <p className="about__footer-text">
                        {aboutContent.footerText.description}
                    </p>
                    <p className="about__footer-text">
                        {aboutContent.footerText.description2}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default About;
