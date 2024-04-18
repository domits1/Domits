import React from "react";
import './about.css'
import FAQ from "../landingpage/Faq";
import barchart from '../../images/icons/bar-chart.png';

function About() {
    return (
        <main className="aboutus">
            <section>
                <h2>Why choose for Domits</h2>
            </section>
            <section>
                <h3>One of the fastest improving travel platforms.</h3>
            </section>

            <article className="underbigtext">
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
            </article>
            <br />
            <section className="factsbox">
            <article className="awesomefacts">
                    <article className="factsHeader">
                        <p className="factsTitle">
                            Our motto is 1% better every day in product development, integrations, security and intellectual travel leadership.
                        </p>
                        <img className="factsImage" src={barchart}></img>
                    </article>
                </article>
                <article className="awesomefacts">
                    <article className="factsHeader">
                        <p className="factsTitle">
                            Our motto is 1% better every day in product development, integrations, security and intellectual travel leadership.
                        </p>
                        <img className="factsImage" src={barchart}></img>
                    </article>
                </article>
            </section>

            {/* <FAQ /> */}
        </main>


    );
}

export default About;