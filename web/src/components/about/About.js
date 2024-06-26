import React from "react";
import './about.css'
import FAQ from "../landingpage/Faq";
import vision from '../../images/icons/vision.png';
import whatwedo from '../../images/icons/route.png';
import stefan from '../../images/stefan.jpeg';
import tim from '../../images/tim.png';
import chahid from '../../images/chahid.png';
import leila from '../../images/leila.png';
import muhammed from '../../images/Muhammed.png';
import timE from '../../images/timE.png';
import kacper from '../../images/kacper.png';
import sebastiaan from '../../images/sebastiaan.png';
import standard from '../../images/standard.png';
import nick from '../../images/nick.png';
import jiaming from '../../images/jiaming.png';

function About() {
    return (
        <div className="aboutus">
            <div className="AboutDomitsTitleContainer">
                <h2>About Domits</h2>
            </div>
            <div>
                <h3>Tailor made partnership</h3>
            </div>

            <div className="underbigtext">
                <p className="aboutText">
                    <p className="aboutText">
                        Domits is a platform to list, search and book holiday accommodations.
                    </p>
                    <p className="aboutText">
                        We build cool stuff in our travel innovation labs for People, Growth, Cloud IT and AI Data.
                    </p>
                </p>
                <p className="aboutText margintop">
                    In our growing traveltech network are young professionals, influencers, traveltechs, companies and partners.
                    There are also talent pools with students from IT, Data Science, Cyber ​​Security, AI, ML, Marketing and IT law.
                </p>
                <p className="aboutText margintop">
                    <p className="aboutText">
                        We strive to support tenants and landlords in every step of the process.
                        Domits acts as the intermediary in this process.
                    </p>
                    <p className="aboutText">
                        You enter into a rental agreement directly with the landlord and/or owner of the accommodation.
                        Through Domits, you have the opportunity to inquire about options without any obligation.
                    </p>
                </p>
                <p className="aboutText margintop">
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
                <h1 className="aboutWhoWeAreText margintop">Who we are</h1>
                <p className="aboutWhoWeAreText marginbottom">We are all conscious founders.</p>

                <div class="team">
                    <div class="member">
                        <div class="avatar">
                            <img src={stefan} alt="" />
                        </div>
                        <p>Stefan Hopman</p>
                        <p>Founder and CEO</p>
                    </div>
                    <div class="member">
                        <div class="avatar">
                            <img src={tim} alt="" />
                        </div>
                        <p>Tim Hart</p>
                        <p>Product Owner</p>
                    </div>
                    <div class="member">
                        <div class="avatar">
                            <img src={standard} alt="" />
                        </div>
                        <p>Hamza Zaraoui</p>
                        <p>Fullstack developer</p>
                    </div>
                    <div class="member">
                        <div class="avatar">
                            <img src={sebastiaan} alt="" />
                        </div>
                        <p>Sebastiaan van der Wilt</p>
                        <p>Fullstack developer</p>
                    </div>
                    <div class="member">
                        <div class="avatar">
                            <img src={muhammed} alt="" />
                        </div>
                        <p>Muhammed Çetinkaya</p>
                        <p>Back-end developer</p>
                    </div>
                </div>

                <div class="team">
                    <div class="member">
                        <div class="avatar">
                            <img src={kacper} alt="" />
                        </div>
                        <p>Kacper Flak</p>
                        <p>Back-end developer</p>
                    </div>
                    <div class="member">
                        <div class="avatar">
                            <img src={standard} alt="" />
                        </div>
                        <p>Tim Seijlhouwer</p>
                        <p>Fullstack developer</p>
                    </div>
                    <div class="member">
                        <div class="avatar">
                            <img src={chahid} alt="" />
                        </div>
                        <p>Chahid Laaouar</p>
                        <p>Fullstack developer</p>
                    </div>
                    <div class="member">
                        <div class="avatar">
                            <img src={jiaming} alt="" />
                        </div>
                        <p>Jiaming Yan</p>
                        <p>Back-end developer</p>
                    </div>
                    <div class="member">
                        <div class="avatar">
                            <img src={leila} alt="" />
                        </div>
                        <p>Leila Boutkabout</p>
                        <p>UX/UI Designer</p>
                    </div>
                </div>

                <div class="team">
                    <div class="member">
                        <div class="avatar">
                        <img src={standard} alt="" />
                        </div>
                            <p>Aniss Bouabdallah</p>
                        <p>Business developer</p>
                    </div>
                    <div class="member">
                        <div class="avatar">
                            <img src={timE} alt="" />
                        </div>
                        <p>Tim Eerdmans</p>
                        <p>Business developer</p>
                    </div>
                    <div class="member">
                        <div class="avatar">
                            <img src={nick} alt="" />
                        </div>
                        <p>Nick Ryan</p>
                        <p>Back-end developer</p>
                    </div>
                    <div class="member">
                        <div class="avatar">
                            <img src={standard} alt="" />
                        </div>
                        <p>This can be you!</p>
                        <p>We're hiring!</p>
                    </div>
                    <div class="member">
                        <div class="avatar">
                            <img src={standard} alt="" />
                        </div>
                        <p>This can be you!</p>
                        <p>We're hiring!</p>
                    </div>
                </div>

                <div class="about">
                    <p>We believe that every employee can be a conscious founder. And you are allowed to think and act that way. A conscious founder is an entrepreneur who makes decisions based on health, safety and future-proofing. For themselves, the organization, customers, partners and society.</p>
                    <p>You take responsibility. Discovers new ways to get things done. And comes up with new ideas and solutions. You want to create, build and develop together. We are always looking for new founders.</p>
                </div>
            </div>
            {/* <FAQ /> */}
        </div>


    );
}

export default About;

