import React from "react";
import huis from "../../images/accom_villaneth.png";
import growth from "../../images/icons/users-01.png"
import people from "../../images/icons/trend-up-01.png"
import cloud from "../../images/icons/cloud-01.png"
import data from "../../images/icons/cpu-chip-01.png"

import './ninedots.css';

function TravelInnovation() {
    return (
        <div>
            <div className="imageContainer" style={{ backgroundImage: `url(${huis})` }}>
                <h1 className="title">Travel Innovation Lab</h1>
                <h3 className="subTitle">Sustainable Development Creation</h3>
            </div>
            <div className="boxContainer">
                <div className="boxRow">


                    <div className="boxColumn">
                        <div className="titleHolder">
                            <img className="boxIcon" src={growth}></img>
                            <p className="boxTitle">Growth</p>
                        </div>

                        <div className="box">

                        </div>
                    </div>

                    <div className="boxColumn">
                        <div className="titleHolder">
                            <img className="boxIcon" src={people}></img>
                            <p className="boxTitle">People</p>
                        </div>

                        <div className="box">

                        </div>
                    </div>

                    <div className="boxColumn">
                        <div className="titleHolder">
                            <img className="boxIcon" src={cloud}></img>
                            <p className="boxTitle">Cloud Ict</p>
                        </div>

                        <div className="box">

                        </div>
                    </div>

                    <div className="boxColumn">
                        <div className="titleHolder">
                            <img className="boxIcon" src={data}></img>
                            <p className="boxTitle">A.I. data</p>
                        </div>

                        <div className="box">

                        </div>
                    </div>


                </div>
            </div>
        </div>
    );
}

export default TravelInnovation;
