import React from "react";
import Header from "./Header";
function Contact() {
    return (
        <div className="contact">
            <h1>Contact our specialists</h1>
            <br />
            <h3>
                We are 24/7 available to ensure optimal reachability across all time zones. 
                The more specific you are in your reach out, the faster we can assist you! 
                We always get back to you within 24 hours of reaching out. Not received any response from us yet? 
                Check your spam inbox.
            </h3>
            <div className="contactform">
                <h2>Name</h2>
                <input type="text" placeholder="ex. Sheima Mahmoudi" />
                
                <h2>Subject</h2>
                <input type="text" placeholder="ex: Payment issues" />

                <h2>Enter your email</h2>
                <input type="email" placeholder="ex. sheima1999@gmail.com"/>
            </div>
        </div>
    );
}

export default Contact;