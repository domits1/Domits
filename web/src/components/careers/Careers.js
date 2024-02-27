import React from "react";
import careerimg from '../../images/careerimg.png';
import './careers.css'

function Career() {
    return (
        <div className="careers">
            <div className="careertext">
                <h1>Ah, looking for a job?</h1>
                <br />
                <div className="careerimg">
                    <img id="careerimg" src={careerimg} alt="careerimg" />
                </div>
                <p>Check our open positions below.
                    If there are none available, please contact us through the contact form with your subject as “open application”</p>
                <p>Our HR team will reply to your application personally!</p>
            </div>

            <div className="jobbubbles">
                <div className="jobbubble">
                    <div className="jobcat">
                        <p>Design</p>
                    </div>
                    <div className="bubbletext">
                        <h4>UI Designer</h4>
                        <p>Haarlem / Remote</p>
                        <p id="moreinfo">More info</p>
                    </div>
                </div>

                <div className="jobbubble">
                    <div className="jobcat">
                        <p>HR</p>
                    </div>
                    <div className="bubbletext">
                        <h4>Recruiter</h4>
                        <p>Remote</p>
                        <p id="moreinfo">More info</p>
                    </div>
                </div>

                <div className="jobbubble">
                    <div className="jobcat">
                        <p>Design</p>
                    </div>
                    <div className="bubbletext">
                        <h4>Motion Designer</h4>
                        <p>Haarlem / Remote</p>
                        <p id="moreinfo">More info</p>
                    </div>
                </div>

                <div className="jobbubble">
                    <div className="jobcat">
                        <p>Design</p>
                    </div>
                    <div className="bubbletext">
                        <h4>UX Designer</h4>
                        <p>Haarlem / Remote</p>
                        <p id="moreinfo">More info</p>
                    </div>
                </div>

                <div className="jobbubble">
                    <div className="jobcat">
                        <p>Allround</p>
                    </div>
                    <div className="bubbletext">
                        <h4>Internship</h4>
                        <p>Haarlem / Remote</p>
                        <p id="moreinfo">More info</p>
                    </div>
                </div>

                <h4 id="openapp">Open Application</h4>
            </div>
        </div>
    );
}

export default Career;