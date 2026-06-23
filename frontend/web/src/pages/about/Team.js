import React, { useContext } from "react";

import stefan from "../../images/about-img/stefan.jpeg";
import tim from "../../images/about-img/tim.png";

import standard from "../../images/standard.png";
import nick from "../../images/nick.png";

import Ales from "../../images/about-img/Ales.jpg";
import Chant from "../../images/about-img/Chant.jpg";
import Chiel from "../../images/about-img/Chiel.png";
import Justin from "../../images/about-img/Justin.jpg";
import Robert from "../../images/about-img/Robert.jpg";
import Robin from "../../images/about-img/Robin.jpg";
import Sam from "../../images/about-img/Sam.jpg";
import Jared from "../../images/about-img/Jared.jpg";
import Sander from "../../images/about-img/Sander.png";
import Bekir from "../../images/about-img/Bekir.png";
import Kacper from "../../images/about-img/Kacper.png";
import Valentijn from "../../images/about-img/valentijn.png";
import Sakhi from "../../images/about-img/Sakhi.png";
import Denisa from "../../images/about-img/Denisa.jpeg";
import Omer from "../../images/about-img/Omer.jpg";
import Ameen from "../../images/about-img/Ameen.jpg";

import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = { en, nl, de, es };

function Team() {
  const { language } = useContext(LanguageContext);
  const aboutContent = contentByLanguage[language]?.about;

  if (!aboutContent) return null;

  const founderMembers = [
    { name: "Stefan", src: stefan, role: aboutContent.crew.founder },
    { name: "Robert", src: Robert, role: aboutContent.crew.engineeringManager },
  ].sort((a, b) => a.name.localeCompare(b.name));

  const developerMembers = [
    { name: "Tim H.", src: tim, role: aboutContent.crew.developer },
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
    { name: "Ahsanul", src: standard, role: aboutContent.crew.developer },
    { name: "Alessio", src: standard, role: aboutContent.crew.developer },
    { name: "Asif", src: standard, role: aboutContent.crew.developer },
    { name: "Burak", src: standard, role: aboutContent.crew.developer },
    { name: "Chiel", src: Chiel, role: aboutContent.crew.developer },
    { name: "Gurpreet", src: standard, role: aboutContent.crew.developer },
    { name: "Ho Tin", src: standard, role: aboutContent.crew.developer },
    { name: "Ken", src: standard, role: aboutContent.crew.developer },
    { name: "Moncef", src: standard, role: aboutContent.crew.developer },
    { name: "Stephanie", src: standard, role: aboutContent.crew.developer },
    { name: "Tom", src: standard, role: aboutContent.crew.developer },
    { name: "Valentijn", src: Valentijn, role: aboutContent.crew.developer },
    { name: "Yusuf", src: standard, role: aboutContent.crew.developer },
    { name: "Sakhi", src: Sakhi, role: aboutContent.crew.developer },
    { name: "Denisa", src: Denisa, role: aboutContent.crew.designer },
    { name: "Omer", src: Omer, role: aboutContent.crew.developer },
    { name: "Ameen", src: Ameen, role: aboutContent.crew.developer },
    { name: "Hadeel", src: standard, role: aboutContent.crew.developer },
  ].sort((a, b) => a.name.localeCompare(b.name));

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

  const groups = [
    { title: "Management", members: founderMembers },
    { title: "Engineering", members: developerMembers },
    {
      title: "Marketing, Contracting, Partnerships, Support",
      members: marketingMembers,
    },
  ];

  return (
    <div className="team">
      <h1 className="team__title">{aboutContent.crew.whoWeAre}</h1>
      <p className="team__subtitle">{aboutContent.crew.weAreAll}</p>

      {groups.map((group) => (
        <div className="team__group" key={group.title}>
          <h2 className="team__group-title">{group.title}</h2>
          <div className="team__grid">
            {group.members.map((member) => (
              <div className="team__member" key={member.name}>
                <div className="team__avatar">
                  <img
                    className="team__avatar-image"
                    src={member.src}
                    alt={member.name}
                    loading="lazy"
                  />
                </div>
                <p className="team__member-name">{member.name}</p>
                <p className="team__member-role">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="team__footer">
        <p className="team__footer-text">{aboutContent.footerText.description}</p>
        <p className="team__footer-text">{aboutContent.footerText.description2}</p>
      </div>
    </div>
  );
}

export default Team;
