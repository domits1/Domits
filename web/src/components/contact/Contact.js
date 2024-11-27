import React, { useState } from "react";
import "./contact.css";

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
            <h1>Contact our specialists</h1>
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
                        <textarea
                            id="message"
                            placeholder="ex. I am still waiting to get paid and would like a follow-up or open a dispute about this..."
                        ></textarea>
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
                    </div>
                </div>
            </form>
        </div>
    );
}

export default Contact;