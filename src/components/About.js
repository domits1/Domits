import React from "react";
import Header from "./Header";
import img from "./aboutusimg.png"

function About() {
    return (
       <div className="aboutus">
            <div className="bigtext">
                <h1>“Our mission is to simplify travel for 1 million people”</h1>
            </div>

            <div className="aboutusimg">
                <img src={img} alt="aboutusimg"/>
            </div>

            <div className="underbigtext">
                <p> 
                    Domits is a platform for secure accommodations. On our platform, you'll find a wide range of lodging options.
                </p>
                <p>
                    We strive to support tenants and landlords in every step of the process. Domits acts as the intermediary in this process. 
                    You enter into a rental agreement directly with the landlord and/or owner of the accommodation. 
                    Through Domits, you have the opportunity to inquire about options without any obligation. 
                </p>
                <p>
                    By charging one-time service fees, we can keep our platform running and provide services such as support.
                </p>
            </div>
                <br />
            <div className="awesomefacts">
                <h1>Awesome Facts</h1>
            </div>

            <div className="textbubbles">
                <div className="bubble1">
                    <br />
                    <h1>120000 listings!</h1>
                    <br />
                </div>
                <div className="bubble2">
                    <br />
                    <h1>Since 2023</h1>
                    <br />
                </div>
                <div className="bubble3">
                    <br />
                    <h1>More than 15 staff</h1>
                    <br />
                </div>
                <div className="bubble4">
                    <br />
                    <h1>13000 customers</h1>
                    <br />
                </div>
                <div className="bubble5">
                    <br />
                    <h1>Adding houses daily</h1>
                    <br />
                </div>
            </div>
       </div>
    );
}

export default About;