import React, { useContext } from "react";
import vision from "../../images/icons/vision.png";
import whatwedo from "../../images/icons/route.png";

import stefan from "../../images/about-img/stefan.jpeg";
import tim from "../../images/about-img/tim.png";

import standard from "../../images/standard.png";
import nick from "../../images/nick.png";

import Ales from "../../images/about-img/Ales.jpg";
import Chant from "../../images/about-img/Chant.jpg";
import Justin from "../../images/about-img/Justin.jpg";
import Robert from "../../images/about-img/Robert.jpg";
import Robin from "../../images/about-img/Robin.jpg";
import Sam from "../../images/about-img/Sam.jpg";
import Jared from "../../images/about-img/Jared.jpg";
import Sander from "../../images/about-img/Sander.png";
import Bekir from "../../images/about-img/Bekir.png";
import Kacper from "../../images/about-img/Kacper.png";

import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

// Handy tool for editing the images:
// https://imageresizer.com/image-compressor

function About() {
  const { language } = useContext(LanguageContext);
  const aboutContent = contentByLanguage[language]?.about;

  if (!aboutContent) return null;

  const founderMembers = [
    { name: "Stefan", src: stefan, role: aboutContent.crew.founder },
    { name: "Robert", src: Robert, role: aboutContent.crew.engineeringManager },
    { name: "Tim H.", src: tim, role: aboutContent.crew.productOwner },
  ];

  const developerMembers = [
    { name: "Ales", src: Ales, role: aboutContent.crew.developer },
    { name: "Bekir", src: Bekir, role: aboutContent.crew.developer },
    { name: "Chant", src: Chant, role: aboutContent.crew.developer },
    { name: "Justin", src: Justin, role: aboutContent.crew.developerDistribution },
    { name: "Kacper", src: Kacper, role: aboutContent.crew.developer },
    { name: "Nick Ryan", src: nick, role: aboutContent.crew.developer },
    { name: "Raman", src: standard, role: aboutContent.crew.developer },
    { name: "Robin", src: Robin, role: aboutContent.crew.security },
    { name: "Sam", src: Sam, role: aboutContent.crew.developer },
    { name: "Sander", src: Sander, role: aboutContent.crew.developer },
    { name: "Sem", src: standard, role: aboutContent.crew.developer },

    // New developers
    { name: "Ahsanul", src: standard, role: aboutContent.crew.developer },
    { name: "Alessio", src: standard, role: aboutContent.crew.developer },
    { name: "Asif", src: standard, role: aboutContent.crew.developer },
    { name: "Burak", src: standard, role: aboutContent.crew.developer },
    { name: "Gurpreet", src: standard, role: aboutContent.crew.developer },
    { name: "Ho Tin", src: standard, role: aboutContent.crew.developer },
    { name: "Ken", src: standard, role: aboutContent.crew.developer },
    { name: "Moncef", src: standard, role: aboutContent.crew.developer },
    { name: "Stephanie", src: standard, role: aboutContent.crew.developer },
    { name: "Tom", src: standard, role: aboutContent.crew.developer },
    { name: "Yusuf", src: standard, role: aboutContent.crew.developer },
  ]
    .sort((a, b) => a.name.localeCompare(b.name));

  const marketingMembers = [
    { name: "Jared", src: Jared, role: aboutContent.crew.growth },
    { name: "Julian", src: standard, role: aboutContent.crew.growth },
    { name: "Maroan", src: standard, role: aboutContent.crew.growth },
    { name: "Thijmen", src: standard, role: aboutContent.crew.growth },
    {
      name: aboutContent.crew.canBeYou,
      src: standard,
      role: aboutContent.crew.hiring,
    },
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="about">
      <div className="about__title-container">
        <h2 className="about__title">
          <span className="highlightH2">{aboutContent.title}</span>
        </h2>
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
          {aboutContent.mission.readHere}
          <a className="ref" href="/how-it-works">
            {aboutContent.mission.howItWorks}
          </a>
          {aboutContent.mission.and}
          <a className="ref" href="/why-domits">
            {aboutContent.mission.whyDomits}
          </a>
          .
        </p>
      </div>

      <br />

      <div className="about__factsbox">
        <div className="about__fact">
          <div className="about__fact-header">
            <p className="about__fact-title">{aboutContent.vision.title}</p>
            <img className="about__fact-image" src={vision} alt="Vision" />
          </div>
          <p className="about__fact-subtitle">{aboutContent.vision.subTitle}</p>
          <p className="about__fact-text">{aboutContent.vision.description}</p>
        </div>

        <div className="about__fact">
          <div className="about__fact-header">
            <p className="about__fact-title">{aboutContent.whatWeDo.title}</p>
            <img className="about__fact-image" src={whatwedo} alt="What we do" />
          </div>
          <p className="about__fact-subtitle">{aboutContent.whatWeDo.subTitle}</p>
          <p className="about__fact-text">
            {aboutContent.whatWeDo.description}
            <a className="ref" href="/travelinnovation">
              {aboutContent.whatWeDo.travelInnovation}
            </a>
            .
          </p>
        </div>
      </div>

      <div className="about__crew">
        <h1 className="about__who-we-are-title about__who-we-are-title--margintop">
          {aboutContent.crew.whoWeAre}
        </h1>
        <p className="about__who-we-are-subtitle about__who-we-are-subtitle--marginbottom">
          {aboutContent.crew.weAreAll}
        </p>

        {/* ===================== Founder Section ===================== */}
        <div className="about__group">
          <h2 className="about__group-title">{aboutContent.crew.founder}</h2>

          <div className="about__team about__team--founder">
            {founderMembers
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((member) => (
                <div className="about__member" key={member.name}>
                  <div className="about__avatar">
                    <img
                      className="about__avatar-image"
                      src={member.src}
                      alt={member.name}
                      loading="lazy"
                    />
                  </div>
                  <p className="about__member-name">{member.name}</p>
                  <p className="about__member-role">{member.role}</p>
                </div>
              ))}
          </div>
        </div>

        {/* ===================== Developer Section ===================== */}
        <div className="about__group">
          <h2 className="about__group-title">{aboutContent.crew.developer}</h2>

          <div className="about__team about__team--developer">
            {developerMembers.map((member) => (
              <div className="about__member" key={member.name}>
                <div className="about__avatar">
                  <img
                    className="about__avatar-image"
                    src={member.src}
                    alt={member.name}
                    loading="lazy"
                  />
                </div>
                <p className="about__member-name">{member.name}</p>
                <p className="about__member-role">{member.role}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ===================== Marketing Section ===================== */}
        <div className="about__group">
          <h2 className="about__group-title">{aboutContent.crew.marketing}</h2>

          <div className="about__team about__team--marketing">
            {marketingMembers.map((member) => (
              <div className="about__member" key={member.name}>
                <div className="about__avatar">
                  <img
                    className="about__avatar-image"
                    src={member.src}
                    alt={member.name}
                    loading="lazy"
                  />
                </div>
                <p className="about__member-name">{member.name}</p>
                <p className="about__member-role">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="about__footer">
          <p className="about__footer-text">{aboutContent.footerText.description}</p>
          <p className="about__footer-text">{aboutContent.footerText.description2}</p>
        </div>
      </div>
    </div>
  );
}

export default About;
