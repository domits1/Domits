import React from "react";
import Pages from "./Pages";
import chevron from "../../images/icons/chevron-horizontal.png";
import returner from "../../images/icons/return-icon.png";
import './HostHomepage.css'


function HostCalendar() {

    return (
        <div className="container">
            <h2>Calendar</h2>
            <div className="dashboard">
                <Pages />
                <div className="contentContainer">
                    <div className="boxColumns fullColumn">
                        <div className="box locationBox">
                            <div className="locationBox">
                                <img src={chevron} alt="Chevron"></img>
                                <p>Kinderhuissingel 6k, Haarlem, The Netherlands</p>
                            </div>
                            <div className="locationBox">
                                <img src={returner} alt="Return"></img>
                                <p>Undo</p>
                            </div>
                        </div>
                        <div className="box">
                            <p>Booking availability for Kinderhuissingel 6k, Haarlem</p>
                            <div className="locationBox">
                                <div className="boxColumns locationContent">
                                    <div className="box">
                                    <input type="date" id="date" name="date"></input>
                                    </div>
                                </div>
                                <div className="boxColumns locationContent">
                                    <div className="box">

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}




export default HostCalendar;