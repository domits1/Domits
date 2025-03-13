import React from "react";
import './styles/about.css';
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
                    In our growing traveltech network are young professionals, influencers, traveltechs, companies and
                    partners. There are also talent pools with students from IT, Data Science, Cyber ​​Security, AI, ML,
                    Marketing and IT law.
                </p>

                <p className="about__text about__text--margintop">
                    Read here more about <a className="ref" href="/how-it-works">how Domits works</a> and <a
                    className="ref" href="/why-domits">Why to choose Domits</a>.
                </p>
            </div>
            <br/>
            <div className="about__factsbox">
                <div className="about__fact">
                    <div className="about__fact-header">
                        <p className="about__fact-title">Vision</p>
                        <img className="about__fact-image" src={vision} alt="Vision"/>
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
                        <img className="about__fact-image" src={whatwedo} alt="What we do"/>
                    </div>
                    <p className="about__fact-subtitle">Together with partners we provide travel solutions</p>
                    <p className="about__fact-text">
                        We build our travel platform to list, search and book accommodations.
                        Besides that we are providing traveltech development and consultancy for a select group of
                        partners.
                        We are open to cooperate through ventures and our <a className="ref" href="/travelinnovation">travel
                        innovation labs</a>.
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
                        {name: 'Bekir', src: standard, role: 'Developer'},
                        {name: 'Chant', src: Chant, role: 'Developer'},
                        {name: 'Etka', src: standard, role: 'Developer'},
                        {name: 'Fejsal', src: standard, role: 'Developer'},
                        {name: 'Hamza H.', src: standard, role: 'Developer AI Agents'},
                        {name: 'Hamza Z.', src: standard, role: 'Developer'},
                        {name: 'Justin', src: Justin, role: 'Developer Distribution'},
                        {name: 'Kacper', src: standard, role: 'Developer'},
                        {name: 'Martijn', src: standard, role: 'Developer'},
                        {name: 'Mortada', src: standard, role: 'Developer Revenue'},
                        {name: 'Mohamed', src: muhammed, role: 'Developer'},
                        {name: 'Muhammed', src: muhammed, role: 'Developer'},
                        {name: 'Nick Ryan', src: nick, role: 'Developer'},
                        {name: 'Randy', src: standard, role: 'Developer Distribution'},
                        {name: 'Robin', src: Robin, role: 'Security'},
                        {name: 'Roozbeh', src: Roozbeh, role: 'Developer Revenue'},
                        {name: 'Ryan', src: Ryan, role: 'Developer'},
                        {name: 'Sam', src: Sam, role: 'Developer'},
                        {name: 'Santosh', src: Santosh, role: 'Developer'},
                        {name: 'Sander', src: standard, role: 'Developer'},
                        {name: 'Sebastiaan', src: standard, role: 'Developer'},
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
                        We believe that every employee can be a conscious founder. And you are allowed to think and act
                        that way. A conscious founder is an entrepreneur who makes decisions based on health, safety and
                        future-proofing. For themselves, the organization, customers, partners and society.
                    </p>
                    <p className="about__footer-text">
                        You take responsibility. Discovers new ways to get things done. And comes up with new ideas and
                        solutions. You want to create, build and develop together. We are always looking for new
                        founders.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default About;
