import React from "react";
import huis from "../../images/til-hero.png";
import travel from "../../images/icons/Travel.png";
import './ninedots.css';

function TravelInnovation() {
    return (
        <div>
            <div className="image-container" style={{ backgroundImage: `url(${huis})` }}>
                <h1 className="title">Travel Innovation Labs</h1>
                <h3 className="subtitle">Sustainable Value Creation</h3>
            </div>
            <div className="header-two">
                <div className="header-text">
                    <h2 className="text-h2">Travel Innovation Flywheel</h2>
                    <p className="text-description">
                        The mission of Domits is to simplify travel. For sustainable value creation,
                        we have three innovation labs which come together in our flywheel. The labs
                        are travel finance, travel business, and travel & daily life.
                    </p>
                </div>
                <img className="travel-image" src={travel} alt="Scenic travel destination" />
            </div>
            <div className="travel-container">
                <div className="travel-item">
                    <h2 className="travel-subtitle">Travel Finance</h2>
                    <p>The core starts with simplifying travel finance. We focus on travel payments, travel capital, travel insurance, and travel investing.</p>
                </div>
                <div className="travel-item">
                    <h2 className="travel-subtitle">Travel Business</h2>
                    <p>To serve all travel stakeholders, we have four business divisions: #1 growth, #2 people, #3 cloud ICT, and #4 AI data.</p>
                </div>
                <div className="travel-item">
                    <h2 className="travel-subtitle">Travel & Daily Life</h2>
                    <p>The financial business flow provides opportunities to experience limitless freedom for travel & daily life, like accommodation services, mobility services, municipal services, local services, and many more...</p>
                </div>
            </div>
        </div>
    );
}

export default TravelInnovation;
