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
        <div className="about">
            <div className="about__title-container">
                <h2 className="about__title">About Domits</h2>
            </div>
            <div className="about__subtitle-container">
                <h3 className="about__subtitle">Tailor made partnership</h3>
            </div>

            <div className="about__text-container">
                <p className="about__text">
                    Domits is a platform to list, search and book holiday accommodations.
                </p>
                <p className="about__text">
                    We build cool stuff in our travel innovation labs for People, Growth, Cloud IT and AI Data.
                </p>
                <p className="about__text about__text--margintop">
                    In our growing traveltech network are young professionals, influencers, traveltechs, companies and partners.
                    There are also talent pools with students from IT, Data Science, Cyber ​​Security, AI, ML, Marketing and IT law.
                </p>
                <p className="about__text about__text--margintop">
                    We strive to support tenants and landlords in every step of the process.
                    Domits acts as the intermediary in this process.
                </p>
                <p className="about__text">
                    You enter into a rental agreement directly with the landlord and/or owner of the accommodation.
                    Through Domits, you have the opportunity to inquire about options without any obligation.
                </p>
                <p className="about__text about__text--margintop">
                    By charging one-time service fees, we can keep our platform running and provide services such as support.
                </p>
            </div>
            <br />
            <div className="about__factsbox">
                <div className="about__fact">
                    <div className="about__fact-header">
                        <p className="about__fact-title">Vision</p>
                        <img className="about__fact-image" src={vision} alt="Vision" />
                    </div>
                    <p className="about__fact-subtitle">A healthy, safe and future-proof travel world</p>
                    <p className="about__fact-text">
                        Our vision is a travel world that has less problems with health, safety and future-proofing.
                        Now and in the future, that is what Domits has in mind.
                        Everyone takes into account how people deal with these problems and their options.
                        Together with partners, we work every day to simplify travel.
                    </p>
                </div>
                <div className="about__fact">
                    <div className="about__fact-header">
                        <p className="about__fact-title">What we do</p>
                        <img className="about__fact-image" src={whatwedo} alt="What we do" />
                    </div>
                    <p className="about__fact-subtitle">Together with partners we provide travel solutions</p>
                    <p className="about__fact-text">
                        We build our travel platform to list, search and book accommodations.
                        Besides that we are providing traveltech development and consultancy for a select group of partners.
                        We are open to cooperate through ventures and our travel innovation labs.
                    </p>
                </div>
            </div>
            <div className="about__crew">
                <h1 className="about__who-we-are-title about__who-we-are-title--margintop">Who we are</h1>
                <p className="about__who-we-are-subtitle about__who-we-are-subtitle--marginbottom">We are all conscious founders.</p>

                <div className="about__team">
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={stefan} alt="Stefan Hopman" />
                        </div>
                        <p className="about__member-name">Stefan Hopman</p>
                        <p className="about__member-role">Founder and CEO</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={tim} alt="Tim Hart" />
                        </div>
                        <p className="about__member-name">Tim Hart</p>
                        <p className="about__member-role">Product Owner</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Hamza Zaraoui" />
                        </div>
                        <p className="about__member-name">Hamza Zaraoui</p>
                        <p className="about__member-role">Fullstack developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={sebastiaan} alt="Sebastiaan van der Wilt" />
                        </div>
                        <p className="about__member-name">Sebastiaan van der Wilt</p>
                        <p className="about__member-role">Fullstack developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={muhammed} alt="Muhammed Çetinkaya" />
                        </div>
                        <p className="about__member-name">Muhammed Çetinkaya</p>
                        <p className="about__member-role">Back-end developer</p>
                    </div>
                </div>

                <div className="about__team">
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={kacper} alt="Kacper Flak" />
                        </div>
                        <p className="about__member-name">Kacper Flak</p>
                        <p className="about__member-role">Back-end developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Tim Seijlhouwer" />
                        </div>
                        <p className="about__member-name">Tim Seijlhouwer</p>
                        <p className="about__member-role">Fullstack developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={chahid} alt="Chahid Laaouar" />
                        </div>
                        <p className="about__member-name">Chahid Laaouar</p>
                        <p className="about__member-role">Fullstack developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={jiaming} alt="Jiaming Yan" />
                        </div>
                        <p className="about__member-name">Jiaming Yan</p>
                        <p className="about__member-role">Back-end developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={leila} alt="Leila Boutkabout" />
                        </div>
                        <p className="about__member-name">Leila Boutkabout</p>
                        <p className="about__member-role">UX/UI Designer</p>
                    </div>
                </div>

                <div className="about__team">
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Aniss Bouabdallah" />
                        </div>
                        <p className="about__member-name">Aniss Bouabdallah</p>
                        <p className="about__member-role">Business developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={timE} alt="Tim Eerdmans" />
                        </div>
                        <p className="about__member-name">Tim Eerdmans</p>
                        <p className="about__member-role">Business developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={nick} alt="Nick Ryan" />
                        </div>
                        <p className="about__member-name">Nick Ryan</p>
                        <p className="about__member-role">Back-end developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="This can be you!" />
                        </div>
                        <p className="about__member-name">This can be you!</p>
                        <p className="about__member-role">We're hiring!</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="This can be you!" />
                        </div>
                        <p className="about__member-name">This can be you!</p>
                        <p className="about__member-role">We're hiring!</p>
                    </div>
                </div>

                <div className="about__footer">
                    <p className="about__footer-text">
                        We believe that every employee can be a conscious founder. And you are allowed to think and act that way. A conscious founder is an entrepreneur who makes decisions based on health, safety and future-proofing. For themselves, the organization, customers, partners and society.
                    </p>
                    <p className="about__footer-text">
                        You take responsibility. Discovers new ways to get things done. And comes up with new ideas and solutions. You want to create, build and develop together. We are always looking for new founders.
                    </p>
                </div>
           </div>
            {/* <FAQ /> */}
        </div>
    );
}

export default About;
