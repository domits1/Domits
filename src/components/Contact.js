import React from "react";
import Header from "./Header";
function Contact() {
    return (
        <div className="contact">
            <h1>Contact our specialists</h1>
            <br />
            <h5>
                We are 24/7 available to ensure optimal reachability across all time zones. 
                The more specific you are in your reach out, the faster we can assist you! 
                We always get back to you within 24 hours of reaching out. Not received any response from us yet? 
                Check your spam inbox.
            </h5>
            <div className="contactform">
                <div className="namemessage">
                    <h2>Name</h2>
                    <h2>Your message</h2>
                </div>
                <input type="text" placeholder="ex. Lotte Summer" />
                 
                <div class="biginput">
                  <textarea placeholder="ex. I am still waiting to get paid and would like a follow up or open a dispute about this..."></textarea>
                </div>
                
                <h2>Subject</h2>
                <input type="text" placeholder="ex. Payment issues" />

                <h2>Enter your email</h2>
                <input type="email" placeholder="ex. lotte_summer@gmail.com"/>

                <div className="formbuttons">
                    <button id="attachmentsbutton"> Add attachments</button>
                    <button id="sendbutton"> Send message</button>
                </div>
            </div>
        </div>
    );
}

export default Contact;