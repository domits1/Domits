import React, { useContext, useState } from "react";
import "./contact.css";
import {LanguageContext} from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

const contentByLanguage = {
  en,
  nl,
  de,
  es,
};

function Contact() {
    const [sourceEmail, setSourceEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const [attachmentNames, setAttachmentNames] = useState([]);
        const {language} = useContext(LanguageContext);
        const contactContent = contentByLanguage[language]?.contact;

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
                <h1>{contactContent.faq}</h1>
            <div className="buttonContactContainer">                
            <button className="Contact-button">
                <a href="/helpdesk-guest">{contactContent.guest}</a>
            </button>
      

            <button className="Contact-button">
                <a href="/helpdesk-host">{contactContent.host}</a>
            </button>
            </div>

                <h1>{contactContent.holiday.title}</h1>
                <p className="quistionText">
                    {contactContent.holiday.description}
                </p>

                <h1>{contactContent.areYouHost.title}</h1>
                <p className="quistionText">
                    {contactContent.areYouHost.description}
                </p>

                <h1>{contactContent.address.title}</h1>
                <p className="quistionText">
                    {contactContent.address.description.split('\n').map((line, index) => (
                        <p key={index}>{line}</p>
                    ))}
                </p>

                <h1>{contactContent.opening.title}</h1>
                <p className="quistionText">
                    {contactContent.opening.description}
                </p>

                <h1>{contactContent.contact.title}</h1>
                <p className="quistionText">
                    {contactContent.contact.description.split('\n').map((line, index) => (
                        <p key={index}>{line}</p>
                    ))}
                </p>

            </div>

            <div className="contactFormContainer">
                <h1>{contactContent.form.title}</h1>
                <p>
                    {contactContent.form.description}
                </p>
                {feedbackMessage && (
                    <p className={`feedback ${feedbackMessage.includes("successfully") ? "success" : "error"}`}>
                        {feedbackMessage}
                    </p>
                )}
                <form onSubmit={handleSubmit}>
                    <div className="contactform">
                        <div className="namemessage">
                            <label htmlFor="name">{contactContent.name}</label>
                            <input type="text" id="name" placeholder={contactContent.name} />

                            <label htmlFor="subject">{contactContent.subject}</label>
                            <input type="text" id="subject" placeholder={contactContent.subject} />

                            <label htmlFor="sourceEmail">{contactContent.email}</label>
                            <input
                                type="email"
                                id="sourceEmail"
                                placeholder={contactContent.email}
                                value={sourceEmail}
                                onChange={(e) => setSourceEmail(e.target.value)}
                            />
                        </div>
                        <div className="biginput">
                            <label htmlFor="message">{contactContent.message}</label>
                            <textarea
                                id="message"
                                placeholder={contactContent.message}
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
                            {contactContent.attachment}
                        </button>
                        <button type="submit" id="sendbutton" disabled={isSubmitting}>
                            {isSubmitting ? "Sending..." : `${contactContent.send}`}
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
