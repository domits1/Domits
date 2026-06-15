import React, { useState, useRef, useEffect, useContext, useMemo } from "react";
import PropTypes from "prop-types";
import {
    Info, User, MapPin, XCircle, CreditCard, Home,
    Headphones, Search, MessageCircle, ChevronDown, Plus, Minus, Mail
} from "lucide-react";
import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";
import "./contact.css";

const contentByLanguage = { en, nl, de, es };

const FAQ_DATA = [
    {
        key: "aboutDomits",
        label: "About Domits",
        Icon: Info,
        faqs: [
            { question: "What is Domits and how does it work?", answer: "Domits is a platform where you can rent out your property for guests to book. As a host, you list your property on Domits, and guests can book it for short or long-term stays." },
            { question: "Why Domits?", answer: "Domits offers a unique experience for both Hosts and Guests by using innovative ideas that enhance the booking and hosting experience. We prioritize ease of use, security, and transparency for all users." }
        ]
    },
    {
        key: "manageAccount",
        label: "Manage Account",
        Icon: User,
        faqs: [
            { question: "How do I register on Domits?", answer: "To create your account, simply click 'Sign Up' or 'Log In' on the website, and follow the prompts to enter your details. After the verification step, you will have access to your own Domits account!" },
            { question: "How do I manage my account?", answer: "Managing your account is simple. Navigate to your dashboard and use the designated tabs for each setting or overview, including profile management, booking history, and payment settings." },
            { question: "Is it free to create a guest account?", answer: "Yes, it's completely free to create a guest account on Domits." },
            { question: "I forgot my password.", answer: "To reset your password, simply click the 'I forgot my password' button on the sign-in page and follow the instructions." },
            { question: "How can I delete my account?", answer: "To delete your account, navigate to the dashboard and click on the 'Settings' tab. There you will see the option to delete your Domits account." }
        ]
    },
    {
        key: "searchAndBook",
        label: "Search And Book",
        Icon: MapPin,
        faqs: [
            { question: "How do I search and book?", answer: "To search and book, enter your destination and dates in the search bar on the homepage, browse the listings, and follow the booking process for your chosen accommodation." },
            { question: "How do I see my bookings?", answer: "To see your bookings, navigate to the dashboard and click on the tab 'Bookings'." },
            { question: "How do I change my booking?", answer: "Currently, it is not possible to change a booking after it has been confirmed." },
            { question: "How do I cancel my booking?", answer: "Currently, it is not possible to cancel a booking through the platform. Please contact the host directly if you need to discuss changes." },
            { question: "How do I know if an accommodation is available?", answer: "When searching for accommodations, you can select a date range to ensure that the accommodations you see are available." },
            { question: "Can I see the address of the accommodation?", answer: "The address of an accommodation is found within the details when you click on the listing." },
            { question: "What happens when I make a booking?", answer: "You will have booked an accommodation for the dates you have selected, which you can see in the 'Bookings' tab." },
            { question: "I didn't receive a booking confirmation.", answer: "If you didn't receive a booking confirmation, please check your spam/junk folder. If it's not there, contact Domits support for assistance." },
            { question: "I lost my booking confirmation.", answer: "If you lost your booking confirmation, you can always view and download it again from the 'Bookings' tab in your account dashboard." },
            { question: "How do I know if an accommodation is suitable for disabled people?", answer: "This information is available in the amenities section of each accommodation. Look for details regarding accessibility features." },
            { question: "Can I bring my dog or pet to an accommodation?", answer: "This differs per accommodation. Some hosts allow pets, while others may not. This information is available in the details of each accommodation." },
            { question: "Can I ask the host a question before booking?", answer: "Yes, you can chat with a Host by clicking the 'Chat' button on the accommodation's page." }
        ]
    },
    {
        key: "cancellations",
        label: "Cancellations",
        Icon: XCircle,
        faqs: [
            { question: "Does Domits have a cancellation policy?", answer: "Domits has a cancellation policy that varies depending on the accommodation. Please refer to the specific listing's cancellation terms before booking." },
            { question: "How do I cancel a booking?", answer: "To cancel a booking, you must contact Domits support directly. Currently, there is no option to cancel through the dashboard." },
            { question: "Can I cancel within 24 hours for free?", answer: "The possibility to cancel within 24 hours for free depends on the individual host's cancellation policy. Check the specific listing for details." },
            { question: "What if a host cancels my booking?", answer: "If a host cancels your booking, you will be notified and a refund will be processed according to the cancellation policy." }
        ]
    },
    {
        key: "payments",
        label: "Payments",
        Icon: CreditCard,
        faqs: [
            { question: "How do payments work?", answer: "When you fill in your booking information on the accommodation page, you can proceed to the Booking Overview page and press the 'Confirm & Pay' button to complete your payment." },
            { question: "When do I need to pay?", answer: "Payments are required at the time of booking. Your reservation is not confirmed until payment has been processed." },
            { question: "Which payment methods are available?", answer: "Currently, we offer two payment options: credit card and iDeal. More options will be available soon." }
        ]
    },
    {
        key: "yourStay",
        label: "Your Stay",
        Icon: Home,
        faqs: [
            { question: "What do I need to know before my stay?", answer: "Before your stay, make sure you've communicated with the host about check-in details, and read any house rules or specific instructions provided in the listing." },
            { question: "Can I arrive/depart at a different time?", answer: "Arriving or departing at a different time than stated in the booking may be possible but must be arranged directly with the host." },
            { question: "What should I do if something is wrong during my stay?", answer: "If something is wrong during your stay, contact the Host as your first point of contact. If they are not available, you can reach out to Domits support for help." },
            { question: "When can I check in and/or check out?", answer: "When booking an accommodation, you select your check-in and check-out dates. After booking, contact the host to arrange specific times." }
        ]
    },
    {
        key: "support",
        label: "Support",
        Icon: Headphones,
        faqs: [
            { question: "How do I contact Domits support?", answer: "You can contact Domits support by filling in our contact form below. We aim to respond to all inquiries within 24 hours." },
            { question: "What should I do if I encounter a technical issue on the website?", answer: "If you encounter a technical issue on the Domits website, please try refreshing the page or clearing your browser's cache. If the issue persists, contact our support team via the contact form." },
            { question: "Can I get support in multiple languages?", answer: "Currently, our support is primarily offered in English and Dutch. However, we are working to expand our language support in the near future." },
            { question: "Is there a phone number I can call for support?", answer: "At this time, Domits does not offer phone support. All inquiries should be submitted through our contact form." }
        ]
    }
];

const faqItemShape = PropTypes.shape({
    question: PropTypes.string.isRequired,
    answer: PropTypes.string.isRequired,
});

const FaqAccordionItem = ({ question, answer }) => {
    const [open, setOpen] = useState(false);
    const bodyRef = useRef(null);

    return (
        <button type="button" className="contact-faq-item" aria-expanded={open} onClick={() => setOpen(o => !o)}>
            <div className="contact-faq-item__header">
                <span className="contact-faq-item__question">{question}</span>
                <ChevronDown
                    className={`contact-faq-item__chevron${open ? " contact-faq-item__chevron--open" : ""}`}
                    size={16}
                />
            </div>
            <div
                className="contact-faq-item__body"
                style={{ maxHeight: open ? `${bodyRef.current?.scrollHeight ?? 500}px` : "0" }}
            >
                <div ref={bodyRef}>
                    <p>{answer}</p>
                </div>
            </div>
        </button>
    );
};

FaqAccordionItem.propTypes = {
    question: PropTypes.string.isRequired,
    answer: PropTypes.string.isRequired,
};

const FaqCategoryCard = ({ category, lowerQuery, frequentlyAsked }) => {
    const [open, setOpen] = useState(false);
    const { label, Icon, faqs } = category;

    const visibleFaqs = lowerQuery
        ? faqs.filter(f =>
            f.question.toLowerCase().includes(lowerQuery) ||
            f.answer.toLowerCase().includes(lowerQuery)
          )
        : faqs;

    if (lowerQuery.length > 0 && visibleFaqs.length === 0) return null;

    const isExpanded = open || lowerQuery.length > 0;

    return (
        <div className={`contact-faq-card${isExpanded ? " contact-faq-card--open" : ""}`}>
            <button
                type="button"
                className="contact-faq-card__header"
                aria-expanded={isExpanded}
                aria-controls={`contact-faq-category-${category.key}`}
                onClick={() => setOpen(o => !o)}
            >
                <div className="contact-faq-card__icon">
                    <Icon size={20} />
                </div>
                <div className="contact-faq-card__info">
                    <h3>{label}</h3>
                    <span>{frequentlyAsked}</span>
                </div>
                <span className="contact-faq-card__toggle" aria-hidden="true">
                    {isExpanded ? <Minus size={18} /> : <Plus size={18} />}
                </span>
            </button>
            {isExpanded && (
                <div className="contact-faq-card__body" id={`contact-faq-category-${category.key}`}>
                    {visibleFaqs.map((faq) => (
                        <FaqAccordionItem key={faq.question} question={faq.question} answer={faq.answer} />
                    ))}
                </div>
            )}
        </div>
    );
};

FaqCategoryCard.propTypes = {
    category: PropTypes.shape({
        key: PropTypes.string.isRequired,
        label: PropTypes.string.isRequired,
        Icon: PropTypes.elementType.isRequired,
        faqs: PropTypes.arrayOf(faqItemShape).isRequired,
    }).isRequired,
    lowerQuery: PropTypes.string.isRequired,
    frequentlyAsked: PropTypes.string.isRequired,
};

const API_BASE_URL =
    process.env.REACT_APP_CONTACT_EMAIL_ENDPOINT ||
    "https://bugbtl25mj.execute-api.eu-north-1.amazonaws.com/sendEmail";
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

function Contact() {
    const [searchQuery, setSearchQuery] = useState("");
    const [formOpen, setFormOpen] = useState(false);
    const [sourceEmail, setSourceEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState("");
    const [attachmentNames, setAttachmentNames] = useState([]);
    const formRef = useRef(null);
    const nameRef = useRef(null);
    const subjectRef = useRef(null);
    const messageRef = useRef(null);
    const { language } = useContext(LanguageContext);
    const t = contentByLanguage[language]?.contact || {};

    useEffect(() => {
        if (formOpen) formRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [formOpen]);

    const handleAttachmentChange = (event) => {
        const files = [...event.target.files];
        if (files.length > 5) { alert("You can upload a maximum of 5 files."); return; }
        for (const file of files) {
            if (file.size > 5 * 1024 * 1024) { alert(`File "${file.name}" exceeds the 5 MB size limit.`); return; }
        }
        setAttachmentNames(files.map((f) => f.name));
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setIsSubmitting(true);

        const name = nameRef.current.value.trim();
        const subject = subjectRef.current.value.trim();
        const message = messageRef.current.value.trim();

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

        const payload = { name, subject, sourceEmail, message, attachments: [] };
        const fileInput = document.getElementById("fileInput");
        const totalFiles = fileInput.files.length;

        if (totalFiles > 0) {
            for (const file of Array.from(fileInput.files)) {
                const reader = new FileReader();
                reader.onload = () => {
                    payload.attachments.push({ filename: file.name, content: reader.result.split(",")[1], contentType: file.type });
                    if (payload.attachments.length === totalFiles) sendRequest(payload);
                };
                reader.readAsDataURL(file);
            }
        } else {
            sendRequest(payload);
        }
    };

    const sendRequest = (payload) => {
        fetch(API_BASE_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
            .then((r) => r.json())
            .then((data) => {
                setFeedbackMessage(data.success ? "Message sent successfully!" : `Failed to send message: ${data.error || "Unknown error"}`);
            })
            .catch((error) => {
                setFeedbackMessage("Error sending message: " + error.message);
            })
            .finally(() => setIsSubmitting(false));
    };

    const categories = t.categories || {};
    const translatedFaqData = useMemo(
        () => FAQ_DATA.map(cat => ({ ...cat, label: categories[cat.key] || cat.label })),
        [language] // eslint-disable-line react-hooks/exhaustive-deps
    );

    const lowerQuery = searchQuery.toLowerCase();
    const hasNoResults = searchQuery.length > 0 && translatedFaqData.every(cat =>
        cat.faqs.every(f =>
            !f.question.toLowerCase().includes(lowerQuery) &&
            !f.answer.toLowerCase().includes(lowerQuery)
        )
    );

    const noResultsMsg = (t.noResults || "No results found for \"{query}\". Try a different search term.")
        .replace("{query}", searchQuery);

    return (
        <div className="contact-page">
            <div className="contact-hero">
                <span className="contact-hero__label">{t.heroLabel || "HELP CENTER"}</span>
                <h1 className="contact-hero__title">
                    {t.heroTitleStart || "How can we "}
                    <span>{t.heroTitleEnd || "help you?"}</span>
                </h1>
                <div className="contact-hero__search">
                    <Search size={18} className="contact-hero__search-icon" />
                    <input
                        type="text"
                        placeholder={t.searchPlaceholder || "Search for answers, bookings, payments, support..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="contact-faq-wrapper">
                {translatedFaqData.map((category) => (
                    <FaqCategoryCard
                        key={category.key}
                        category={category}
                        lowerQuery={lowerQuery}
                        frequentlyAsked={t.frequentlyAsked || "Frequently asked questions"}
                    />
                ))}
                {hasNoResults && (
                    <p className="contact-no-results">{noResultsMsg}</p>
                )}
            </div>

            <div className="contact-cta">
                <div className="contact-cta__left">
                    <div className="contact-cta__icon">
                        <MessageCircle size={24} />
                    </div>
                    <div>
                        <h3>{t.stillNeedHelp || "Still need help?"}</h3>
                        <p>{t.supportSubtitle || "Our support team is here for you 24/7"}</p>
                    </div>
                </div>
                <button className="contact-cta__btn" onClick={() => setFormOpen(o => !o)}>
                    {t.contactSupport || "Contact Support"} {formOpen ? "−" : "→"}
                </button>
            </div>

            {formOpen && (
                <div className="contact-form-section" ref={formRef}>
                    <div className="contact-form-section__header">
                        <div className="contact-form-section__icon">
                            <Mail size={20} />
                        </div>
                        <h2>{t.form?.title || "Contact Form"}</h2>
                    </div>
                    <p>{t.form?.description}</p>
                    {feedbackMessage && (
                        <p className={`contact-feedback${feedbackMessage.includes("successfully") ? " contact-feedback--success" : " contact-feedback--error"}`}>
                            {feedbackMessage}
                        </p>
                    )}
                    <form onSubmit={handleSubmit}>
                        <div className="contact-form-grid">
                            <div className="contact-form-fields">
                                <label htmlFor="name">{t.name || "Name"}</label>
                                <input type="text" id="name" ref={nameRef} placeholder={t.name || "Name"} />

                                <label htmlFor="subject">{t.subject || "Subject"}</label>
                                <input type="text" id="subject" ref={subjectRef} placeholder={t.subject || "Subject"} />

                                <label htmlFor="sourceEmail">{t.email || "Your Email"}</label>
                                <input
                                    type="email"
                                    id="sourceEmail"
                                    placeholder={t.email || "Your Email"}
                                    value={sourceEmail}
                                    onChange={(e) => setSourceEmail(e.target.value)}
                                />
                            </div>
                            <div className="contact-form-message">
                                <label htmlFor="message">{t.message || "Message"}</label>
                                <textarea id="message" ref={messageRef} placeholder={t.message || "Message"} />
                            </div>
                        </div>
                        <div className="contact-form-actions">
                            <input type="file" id="fileInput" style={{ display: "none" }} multiple onChange={handleAttachmentChange} />
                            <button type="button" className="contact-form-attach" onClick={() => document.getElementById("fileInput").click()}>
                                {t.attachment || "Add attachments"}
                            </button>
                            <button type="submit" className="contact-form-send" disabled={isSubmitting}>
                                {isSubmitting ? "Sending..." : (t.send || "Send message")}
                            </button>
                            {attachmentNames.length > 0 && (
                                <ul className="contact-form-files">
                                    {attachmentNames.map((name) => <li key={name}>{name}</li>)}
                                </ul>
                            )}
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

export default Contact;
