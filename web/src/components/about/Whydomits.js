import React from "react";
import './about.css'
import FAQ from "../landingpage/Faq";
import barchart from '../../images/icons/bar-chart.png';

function About() {
    return (
        <div className="aboutus">
            <div>
                <h2>Why choose for Domits</h2>
            </div>
            <div>
                <h3>One of the fastest improving travel platforms.</h3>
            </div>

            <div className="underbigtext">
                <p className="aboutText">
                    Mission: Simplify travel for 1 million people.
                </p>
                <p className="aboutText">
                    Besides our traveltech network and talent, we are one of the fastest improving travel platforms. Although we only launched Domits in late 2023,
                    we have been supporting travel companies to grow since 2015.
                </p>
                <p className="aboutText">
                    Start your journey as a guest or host within minutes. List, search and book holiday accommodations, campers and boats. Save cost with our small system charges.
                    There are no hidden costs or percentage cuts. Save administrative time. Make use of our global payment methods.
                    Enjoy our warmhearted customer centric approach. Try it out for free.
                </p>
            </div>
            <br />
            <div className="factsbox">
            <div className="awesomefacts">
                    <div className="factsHeader">
                        <p className="factsTitle">
                            Our motto is 1% better every day in product development, integrations, security and intellectual travel leadership.
                        </p>
                        <img className="factsImage" src={barchart}></img>
                    </div>
                </div>
                <div className="awesomefacts">
                    <div className="factsHeader">
                        <p className="factsTitle">
                            Our motto is 1% better every day in product development, integrations, security and intellectual travel leadership.
                        </p>
                        <img className="factsImage" src={barchart}></img>
                    </div>
                </div>
            </div>

            <FAQ />
        </div>


    );
}

export default About;

