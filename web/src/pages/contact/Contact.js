import React, { useState } from "react";
import '../../styles/sass/pages/contact/contact.scss';


function Contact() {
    const [sourceEmail, setSourceEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const [attachmentNames, setAttachmentNames] = useState([]);

    const API_BASE_URL = "https://bugbtl25mj.execute-api.eu-north-1.amazonaws.com/sendEmail";

    const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const handleAttachmentChange = (event) => {
        const files = [...event.target.files];
        const maxFiles = 5;
        const maxFileSize = 5 * 1024 * 1024; // 5 MB

        if (files.length > maxFiles) {
            alert("You can upload a maximum of 5 files.");
            return;
        }

        for (let file of files) {
            if (file.size > maxFileSize) {
                alert(`File "${file.name}" exceeds the 5 MB size limit.`);
                return;
            }
        }

        setAttachmentNames(files.map((file) => file.name));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setIsSubmitting(true);

        const name = document.getElementById("name").value.trim();
        const subject = document.getElementById("subject").value.trim();
        const message = document.getElementById("message").value.trim();

        if (!name || !subject || !sourceEmail || !message) {
            setFeedbackMessage("Please fill out all fields.");
            setIsSubmitting(false);
            return;
        }

        if (!isValidEmail(sourceEmail)) {
            setFeedbackMessage("Please enter a valid email address.");
            setIsSubmitting(false);
            return;
        }

        const payload = {
            name,
            subject,
            sourceEmail,
            message,
            attachments: [],
        };

        const fileInput = document.getElementById("fileInput");
        if (fileInput.files.length > 0) {
            for (let i = 0; i < fileInput.files.length; i++) {
                const file = fileInput.files[i];
                const reader = new FileReader();

                reader.onload = () => {
                    payload.attachments.push({
                        filename: file.name,
                        content: reader.result.split(",")[1],
                        contentType: file.type,
                    });

                    // Send request after reading all files
                    if (payload.attachments.length === fileInput.files.length) {
                        sendRequest(payload);
                    }
                };
                reader.readAsDataURL(file);
            }
        } else {
            sendRequest(payload);
        }
    };

    const sendRequest = (payload) => {
        fetch(API_BASE_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    setFeedbackMessage("Message sent successfully!");
                } else {
                    setFeedbackMessage(`Failed to send message: ${data.error || "Unknown error"}`);
                }
            })
            .catch((error) => {
                console.error("Error:", error);
                setFeedbackMessage("Error sending message: " + error.message);
            })
            .finally(() => setIsSubmitting(false));
    };

    const handleAttachmentClick = () => {
        document.getElementById("fileInput").click();
    };

    return (
        <div className="contact">
            <div className="questionsContainer">
                <h1>Frequently Asked Questions (FAQ)</h1>
            <div className="buttonContactContainer">                
            <button className="Contact-button">
                <a href="/helpdesk-guest">Guest</a>
            </button>
      

            <button className="Contact-button">
                <a href="/helpdesk-host">Host</a>
            </button>
            </div>

                <h1>Questions about a holiday home, boat or camper?</h1>
                <p className="quistionText">
                    Do you have a question about a holiday accommodation, booking, or payment? Check our Frequently Asked Questions (FAQ). Domits is an intermediary so you rent the holiday accommodation from the host.
                </p>

                <h1>Are you a host, property owner, or manager?</h1>
                <p className="quistionText">
                    We're always open for new holiday homes, boats, and campers. See on our hosting page how you can start within a couple of minutes for free. Or check our FAQ for hosts.
                </p>

                <h1>Address</h1>
                <p className="quistionText">
                    Domits<br />
                    Kinderhuissingel 6k<br />
                    2013 AS, Haarlem
                </p>

                <h1>Opening hours</h1>
                <p className="quistionText">
                    Monday to Friday via mail, chat, and phone between 09:00 and 17:00
                </p>

                <h1>Contact</h1>
                <p className="quistionText">
                    We are available to ensure optimal reachability across all time zones. The more specific you are in your reach out, the faster we can assist you! We always get back to you as soon as possible. Not received any response from us yet? Check your spam inbox.
                </p>
                <p className="quistionText">Mail: teamdomits@gmail.com</p>
            </div>

            <div className="contactFormContainer">
                <h1>Contact Form</h1>
                <p>
                    We are 24/7 available to ensure optimal reachability across all time zones. The more specific
                    you are in your reach out, the faster we can assist you! We always get back to you within 24
                    hours of reaching out. Not received any response from us yet? Check your spam inbox.
                </p>
                {feedbackMessage && (
                    <p className={`feedback ${feedbackMessage.includes("successfully") ? "success" : "error"}`}>
                        {feedbackMessage}
                    </p>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="contactform">
                        <div className="namemessage">
                            <label htmlFor="name">Name</label>
                            <input type="text" id="name" placeholder="Your name" />

                            <label htmlFor="subject">Subject</label>
                            <input type="text" id="subject" placeholder="Subject" />

                            <label htmlFor="sourceEmail">Your Email</label>
                            <input
                                type="email"
                                id="sourceEmail"
                                placeholder="Your Mail"
                                value={sourceEmail}
                                onChange={(e) => setSourceEmail(e.target.value)}
                            />
                        </div>
                        <div className="biginput">
                            <label htmlFor="message">Message</label>
                            <textarea
                                id="message"
                                placeholder="Your Message"
                            ></textarea>
                        </div>
                    </div>
                    <div className="formbuttons">
                        <input
                            type="file"
                            id="fileInput"
                            style={{ display: "none" }}
                            multiple
                            onChange={handleAttachmentChange}
                        />
                        <button type="button" id="attachmentsbutton" onClick={handleAttachmentClick}>
                            Add attachments
                        </button>
                        <button type="submit" id="sendbutton" disabled={isSubmitting}>
                            {isSubmitting ? "Sending..." : "Send message"}
                        </button>
                        <ul>
                            {attachmentNames.map((name, index) => (
                                <li key={index}>{name}</li>
                            ))}
                        </ul>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Contact;
