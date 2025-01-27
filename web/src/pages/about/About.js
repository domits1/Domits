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
                <h2 className="about__title"><span className="highlightH2">About Domits</span></h2>
                <h3 className="about__title">Tailor-made travel partnerships</h3>
            </div>
            <div className="about__subtitle-container">
                <h4>Mission: Simplify travel.</h4>
            </div>

            <div className="about__text-container">
                <p className="about__text about__text--margintop">
                In our growing traveltech network are young professionals, influencers, traveltechs, companies and partners. There are also talent pools with students from IT, Data Science, Cyber ​​Security, AI, ML, Marketing and IT law.
                </p>

                <p className="about__text about__text--margintop">Read here more about <a className="ref" href="/how-it-works">how Domits works</a> and <a className="ref" href="/why-domits">Why to choose Domits</a>.</p>

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
                        We are open to cooperate through ventures and our <a className="ref" href="/travelinnovation">travel innovation labs</a>.
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
                        <p className="about__member-name">Stefan</p>
                        <p className="about__member-role">Founder</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Robert Hopman" />
                        </div>
                        <p className="about__member-name">Robert</p>
                        <p className="about__member-role">Engineering manager</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={tim} alt="Tim Hart" />
                        </div>
                        <p className="about__member-name">Tim H.</p>
                        <p className="about__member-role">Product Owner</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Developer" />
                        </div>
                        <p className="about__member-name">Bekir </p>
                        <p className="about__member-role">Developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Kacper Flak" />
                        </div>
                        <p className="about__member-name">Mortada </p>
                        <p className="about__member-role">Developer Revenue</p>
                    </div>
                </div>

                <div className="about__team">
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Tim Seijlhouwer" />
                        </div>
                        <p className="about__member-name">Roozbeh </p>
                        <p className="about__member-role">Developer Revenue</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Chahid Laaouar" />
                        </div>
                        <p className="about__member-name">Chant</p>
                        <p className="about__member-role">Developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Jiaming Yan" />
                        </div>
                        <p className="about__member-name">Justin</p>
                        <p className="about__member-role">Developer Distribution</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Leila Boutkabout" />
                        </div>
                        <p className="about__member-name">Randy</p>
                        <p className="about__member-role">Developer Distribution</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="This can be you!" />
                            </div>
                        <p className="about__member-name">Sam</p>
                        <p className="about__member-role">Developer</p>
                    </div>
                </div>

                <div className="about__team">
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Tim Eerdmans" />
                        </div>
                        <p className="about__member-name">Martijn</p>
                        <p className="about__member-role">Developer</p>
                    </div>

                    <div className="about__member">
                    <div className="about__avatar">
                            <img className="about__avatar-image" src={muhammed} alt="Muhammed" />
                        </div>
                        <p className="about__member-name">Muhammed</p>
                        <p className="about__member-role">Developer</p>
                    </div>
                    
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Nick Ryan" />
                        </div>
                        <p className="about__member-name">Etka</p>
                        <p className="about__member-role">Developer</p>
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
                            <img className="about__avatar-image" src={standard} alt="Sem" />
                        </div>
                        <p className="about__member-name">Sem</p>
                        <p className="about__member-role">Developer</p>
                    </div>

                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Sander" />
                        </div>
                        <p className="about__member-name">Sander </p>
                        <p className="about__member-role">Developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Developer" />
                        </div>
                        <p className="about__member-name">Ales </p>
                        <p className="about__member-role">Developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Developer" />
                        </div>
                        <p className="about__member-name">Ryan</p>
                        <p className="about__member-role">Developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Developer" />
                        </div>
                        <p className="about__member-name">Sebastiaan</p>
                        <p className="about__member-role">Developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Developer" />
                        </div>
                        <p className="about__member-name">Hamza H.</p>
                        <p className="about__member-role">Developer AI Agents</p>
                    </div>
                </div>


                <div className="about__team">
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Developer" />
                        </div>
                        <p className="about__member-name">Hamza Z.</p>
                        <p className="about__member-role">Developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Developer" />
                        </div>
                        <p className="about__member-name">Nick Ryan</p>
                        <p className="about__member-role">Developer</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Developer" />
                        </div>
                        <p className="about__member-name">Robin</p>
                        <p className="about__member-role">Security</p>
                    </div>                    
                </div>

                <div className="about__team">
                <div className="about__member">
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Growth" />
                        </div>
                        <p className="about__member-name">Thijmen</p>
                        <p className="about__member-role">Growth</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Growth" />
                        </div>
                        <p className="about__member-name">Santiago</p>
                        <p className="about__member-role">Growth</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Growth" />
                        </div>
                        <p className="about__member-name">Maroan</p>
                        <p className="about__member-role">Growth</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Growth" />
                        </div>
                        <p className="about__member-name">Lisa</p>
                        <p className="about__member-role">Growth</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Growth" />
                        </div>
                        <p className="about__member-name">Jared</p>
                        <p className="about__member-role">Growth</p>
                    </div>
                    <div className="about__member">
                        <div className="about__avatar">
                            <img className="about__avatar-image" src={standard} alt="Growth" />
                        </div>
                        <p className="about__member-name">Vic</p>
                        <p className="about__member-role">Growth</p>
                    </div>
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
