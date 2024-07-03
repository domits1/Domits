import React, { useState } from "react";
import './contact.css';

function Contact() {
    const [sourceEmail, setSourceEmail] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();

        const name = document.getElementById('name').value;
        const subject = document.getElementById('subject').value;
        const message = document.getElementById('message').value;

        if (!name || !subject || !sourceEmail || !message) {
            alert("Please fill out all fields.");
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('subject', subject);
        formData.append('sourceEmail', sourceEmail);
        formData.append('message', message);

        const fileInput = document.getElementById('fileInput');
        for (let i = 0; i < fileInput.files.length; i++) {
            formData.append('attachments', fileInput.files[i]);
        }

        fetch('https://your-api-id.execute-api.region.amazonaws.com/prod/sendEmail', {
            method: 'POST',
            body: formData,
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert("Message sent successfully!");
            } else {
                alert("Failed to send message.");
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("Error sending message.");
        });
    };

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

                        <label htmlFor="sourceEmail">Your Email</label>
                        <input 
                            type="email" 
                            id="sourceEmail" 
                            placeholder="ex. lotte_summer@gmail.com" 
                            value={sourceEmail} 
                            onChange={(e) => setSourceEmail(e.target.value)} 
                        />
                    </div>
                    <div className="biginput">
                        <label htmlFor="message">Your message</label>
                        <textarea id="message" placeholder="ex. I am still waiting to get paid and would like a follow up or open a dispute about this..."></textarea>
                        <div className="formbuttons">
                            <input type="file" id="fileInput" style={{ display: 'none' }} multiple />
                            <button type="button" id="attachmentsbutton" onClick={handleAttachmentClick}>
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