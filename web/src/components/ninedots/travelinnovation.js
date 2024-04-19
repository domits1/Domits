import React from "react";
import huis from "../../images/til-hero.png";
import growth from "../../images/icons/users-01.png"
import people from "../../images/icons/trend-up-01.png"
import cloud from "../../images/icons/cloud-01.png"
import data from "../../images/icons/cpu-chip-01.png"

import './ninedots.css';

function TravelInnovation() {
    return (
        <main>
            <article className="imageContainer" style={{ backgroundImage: `url(${huis})` }}>
                <h1 className="title">Travel Innovation Lab</h1>
                <h3 className="subTitle">Sustainable Development Creation</h3>
            </article>
            <section className="boxContainer">
                <article className="boxRow">


                    <article className="boxColumn">
                        <article className="titleHolder">
                            <img className="boxIcon" src={people}></img>
                            <p className="boxTitle">Growth</p>
                        </article>

                       

                        
                    </article>

                    <article className="boxColumn">
                        <article className="titleHolder">
                            <img className="boxIcon" src={growth}></img>
                            <p className="boxTitle">People</p>
                        </article>

                        

                       
                    </article>

                    <article className="boxColumn">
                        <article className="titleHolder">
                            <img className="boxIcon" src={cloud}></img>
                            <p className="boxTitle">Cloud Ict</p>
                        </article>

                        

                       
                    </article>

                    <article className="boxColumn">
                        <article className="titleHolder">
                            <img className="boxIcon" src={data}></img>
                            <p className="boxTitle">A.I. data</p>
                        </article>

                        

                        
                    </article>


                </article>
            </section>
        </main>
    );
}

export default TravelInnovation;
