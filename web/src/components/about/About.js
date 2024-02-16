import React from "react";
import './about.css'
import img from "../../images/aboutusimg.png"


function About() {
    return (
        <div className="aboutus">
            <div>
                <h2>About Domits</h2>
            </div>
            <div>
                <h3>Tailor made partnership</h3>
            </div>

            <div className="underbigtext">
                <p className="aboutText">
                    Domits is a platform to list, search and book holiday accommodations.
                    We build cool stuff in our travel innovation labs for People, Growth, Cloud IT and AI Data.
                </p>
                <p className="aboutText">
                    In our growing traveltech network are young professionals, influencers, traveltechs, companies and partners.
                    There are also talent pools with students from IT, Data Science, Cyber ​​Security, AI, ML, Marketing and IT law.
                </p>
                <p className="aboutText">
                    We strive to support tenants and landlords in every step of the process.
                    Domits acts as the intermediary in this process.
                    You enter into a rental agreement directly with the landlord and/or owner of the accommodation.
                    Through Domits, you have the opportunity to inquire about options without any obligation.
                </p>
                <p className="aboutText">
                    By charging one-time service fees, we can keep our platform running and provide services such as support.
                </p>
            </div>
            <br />
            <div className="awesomefacts">
                <h1>Awesome Facts</h1>
            </div>

            <div className="textbubbles">
                <div className="bubble1">
                    <br />
                    <h1>120 listings!</h1>
                    <br />
                </div>
                <div className="bubble2">
                    <br />
                    <h1>Since 2023</h1>
                    <br />
                </div>
                <div className="bubble3">
                    <br />
                    <h1>More than 15 staff</h1>
                    <br />
                </div>
                <div className="bubble4">
                    <br />
                    <h1>130 customers</h1>
                    <br />
                </div>
                <div className="bubble5">
                    <br />
                    <h1>Adding houses daily</h1>
                    <br />
                </div>
            </div>
        </div>
    );
}

export default About;

