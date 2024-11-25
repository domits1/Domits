import React from "react";
import huis from "../../images/til-hero.png";
import growth from "../../images/icons/users-01.png";
import people from "../../images/icons/trend-up-01.png";
import cloud from "../../images/icons/cloud-01.png";
import data from "../../images/icons/cpu-chip-01.png";
import travel from "../../images/icons/Travel.png";

import './ninedots.css';

function TravelInnovation() {
    function renderIconWithTitle(icon, title) {
        return (
            <div className="boxColumn">
                <div className="titleHolder">
                    <img className="boxIcon" src={icon} alt={title} />
                    <p className="boxTitle">{title}</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="imageContainer" style={{ backgroundImage: `url(${huis})` }}>
                <h1 className="title">Travel Innovation Lab</h1>
                <h3 className="subTitle">Sustainable Development Creation</h3>
            </div>
            <div className="boxContainer">
                <div className="boxRow">
                    {renderIconWithTitle(people, "Growth")}
                    {renderIconWithTitle(growth, "People")}
                    {renderIconWithTitle(cloud, "Cloud Ict")}
                    {renderIconWithTitle(data, "A.I. data")}
                </div>
            </div>
            <div className="headerTwo">
                <div className="headerTwoText">
                    <h2 className="TextTravelh2">Travel Innovation Flywheel</h2>
                    <p className="TextTravel">The mission of Domits is to simplify travel. For sustainable value creation we have three innovation labs which come together in our flywheel. The labs are travel finance, travel business, and travel & daily life.</p>
                </div>
                <img className="travel" src={travel} alt="Scenic travel destination" />
            </div>
            <div class="travelContainer">
            <div class="travelItem">
                <h2>Travel Finance</h2>
                <p>The core starts with simplifying travel finance. We focus on travel payments, travel capital, travel insurance and travel investing.</p>
            </div>
            <div class="travelItem">
                <h2>Travel Business</h2>
                <p>To serve all travel stakeholders we have four business divisions #1 growth, #2 people, #3 cloud ict and #4 ai data.</p>
            </div>
            <div class="travelItem">
                <h2>Travel & Daily Life</h2>
                <p>The financial business flow provides opportunities to experience limitless freedom for travel & daily life like accommodation services, mobility services, municipal services, local services and many more...</p>
            </div>
        </div>
        </div>
    );
}

export default TravelInnovation;
