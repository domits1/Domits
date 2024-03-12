import React from "react";
import './about.css'
import FAQ from "../landingpage/Faq";
import vision from '../../images/icons/vision.png';
import whatwedo from '../../images/icons/route.png';

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
                    <p>
                        Domits is a platform to list, search and book holiday accommodations.
                    </p>
                    <p>
                        We build cool stuff in our travel innovation labs for People, Growth, Cloud IT and AI Data.
                    </p>
                </p>
                <p className="aboutText">
                    In our growing traveltech network are young professionals, influencers, traveltechs, companies and partners.
                    There are also talent pools with students from IT, Data Science, Cyber ​​Security, AI, ML, Marketing and IT law.
                </p>
                <p className="aboutText">
                    <p>
                        We strive to support tenants and landlords in every step of the process.
                        Domits acts as the intermediary in this process.
                    </p>
                    <p>
                        You enter into a rental agreement directly with the landlord and/or owner of the accommodation.
                        Through Domits, you have the opportunity to inquire about options without any obligation.
                    </p>
                </p>
                <p className="aboutText">
                    By charging one-time service fees, we can keep our platform running and provide services such as support.
                </p>
            </div>
            <br />
            <div className="factsbox">
                <div className="awesomefacts">
                    <div className="factsHeader">
                        <p className="factsTitle">Vision</p>
                        <img className="factsImage" src={vision}></img>
                    </div>
                    <p className="factsTitle">A healthy, safe and future-proof travel world</p>
                    <p className="factsText">
                        Our vision is a travel world that has less problems with health, safety and future-proofing.
                        Now and in the future, that is what Domits has in mind.
                        Everyone takes into account how people deal with these problems and their options.
                        Together with partners, we work every day to simplify travel.
                    </p>
                </div>
                <div className="awesomefacts">
                    <div className="factsHeader">
                        <p className="factsTitle">What we do</p>
                        <img className="factsImage" src={whatwedo}></img>
                    </div>
                    <p className="factsTitle">Together with partners we provide travel solutions</p>
                    <p className="factsText">
                        We build our travel platform to list, search and book accommodations.
                        Besides that we are providing traveltech development and consultancy for a select group of partners.
                        We are open to cooperate through ventures and our travel innovation labs.
                    </p>
                </div>
            </div>
            <div className="crew">
                <h1>Who we are</h1>
                <p>We are all conscious founders.</p>

                <div class="team">
                    <div class="member">
                        <div class="avatar"></div>
                        <p>Stefan Hopman</p>
                        <p>Founder and CEO</p>
                    </div>
                    <div class="member">
                        <div class="avatar"></div>
                        <p>Employee 8</p>
                        <p>Marketing Specialist</p>
                    </div>
                    <div class="member">
                        <div class="avatar"></div>
                        <p>Employee 8</p>
                        <p>Marketing Specialist</p>
                    </div>
                    <div class="member">
                        <div class="avatar"></div>
                        <p>Employee 8</p>
                        <p>Marketing Specialist</p>
                    </div>
                    <div class="member">
                        <div class="avatar"></div>
                        <p>Employee 8</p>
                        <p>Marketing Specialist</p>
                    </div>

                </div>

                <div class="about">
                    <p>We believe that every employee can be a conscious founder. And you are allowed to think and act that way. A conscious founder is an entrepreneur who makes decisions based on health, safety and future-proofing. For themselves, the organization, customers, partners and society.</p>
                    <br />
                    <p>You take responsibility. Discovers new ways to get things done. And comes up with new ideas and solutions. You want to create, build and develop together. We are always looking for new founders.</p>
                </div>
            </div>
            <FAQ />
        </div>


    );
}

export default About;