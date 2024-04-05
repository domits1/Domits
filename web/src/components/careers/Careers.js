import React from "react";
import careerimg from '../../images/careerimg.png';
import './careers.css'

function Career() {
    return (
        <div className="careers">
            <div className="careertext">
                <h1>Ah, looking for a job?</h1>
                <div className="careerTextFlex">
                    <div className="careerTextContainerColumn">
                        <p className="careerTopText">
                            Check our open positions below.
                            If there are none available, please contact us through the contact form with your subject as “open application”</p>
                        <p className="careerBottomText">Our HR team will reply to your application personally!</p>
                    </div>
                <img id="careerimg" src={careerimg} alt="careerimg" />
            </div>
        </div>

        <div className="jobBubbleFirstRow">
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
            </div>

            <div className="JobBubbleSecondRow">
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
            </div>
        </div>
    );
}

export default Career;