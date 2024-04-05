import React from "react";
import './contact.css'

function Contact() {
      // Functie voor het afhandelen van het verzenden van het formulier
      const handleSubmit = (event) => {
        event.preventDefault(); // Voorkom dat het formulier daadwerkelijk verstuurt wordt
        // Hier zou je form-validatie en vervolgens de form-data verzending implementeren
    };

    // Functie voor het simuleren van een klik op de verborgen file-input
    const handleAttachmentClick = () => {
        document.getElementById('fileInput').click();
    };

    return (
        <div className="contact">
            <h1>Contact our specialists</h1>
            <p>
                We are 24/7 available to ensure optimal reachability across all time zones.
                The more specific you are in your reach out, the faster we can assist you!
                We always get back to you within 24 hours of reaching out. Not received any response from us yet?
                Check your spam inbox.
            </p>
            
                <form onSubmit={handleSubmit}>
                    <div className="contactform">
                    <div className="namemessage">
                        <label htmlFor="name">Name</label>
                        <input type="text" id="name" placeholder="ex. Lotte Summer" />

                        <label htmlFor="subject">Subject</label>
                        <input type="text" id="subject" placeholder="ex. Payment issues" />

                        <label htmlFor="email">Enter your email</label>
                        <input type="email" id="email" placeholder="ex. lotte_summer@gmail.com" />
                    </div>

            <div className="biginput">
                <label htmlFor="message">Your message</label>
                <textarea id="message" placeholder="ex. I am still waiting to get paid and would like a follow up or open a dispute about this..."></textarea>
                <div className="formbuttons">
                    <input type="file" id="fileInput" style={{ display: 'none' }} multiple />
                    <button 
                        type="button" 
                        id="attachmentsbutton" 
                        onClick={handleAttachmentClick}>
                        Add attachments
                    </button>
                    <button type="submit" id="sendbutton">Send message</button>
                </div>
            </div>
                </div>
            </form>
            
            
        </div>
    );
}

export default Contact;