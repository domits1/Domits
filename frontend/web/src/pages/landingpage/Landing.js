import React, { useState, useEffect, useContext } from "react";
import { Auth } from "aws-amplify";

import { LanguageContext } from "../../context/LanguageContext.js";
import en from "../../content/en.json";
import nl from "../../content/nl.json";
import de from "../../content/de.json";
import es from "../../content/es.json";

import HeroSection from "./components/HeroSection";
import StepsSection from "./components/StepsSection";
import WhySection from "./components/WhySection";
import ChecklistSection from "./components/ChecklistSection";
import RegisterSection from "./components/RegisterSection";
import TestimonialsSection from "./components/TestimonialsSection";
import FeaturesSection from "./components/FeaturesSection";
import FaqSection from "./components/FaqSection";
import CtaSection from "./components/CtaSection";
import ContactForm from "./components/ContactForm.jsx";

import { handleContactFormSubmission } from "../../services/contactService";

const contentByLanguage = { en, nl, de, es };

const buildFaqs = (content) => {
  if (!content) return [];
  return [
    { id: "host", question: content.answerTo.host.title, answer: content.answerTo.host.description, isOpen: false },
    { id: "how", question: content.answerTo.how.title, answer: content.answerTo.how.description, isOpen: false },
    { id: "manage", question: content.answerTo.manage.title, answer: content.answerTo.manage.description, isOpen: false },
    { id: "payout", question: content.answerTo.payout.title, answer: content.answerTo.payout.description, isOpen: false },
    { id: "calendar", question: content.answerTo.calendar.title, answer: content.answerTo.calendar.description, isOpen: false },
  ];
};

function Landing() {
  const { language } = useContext(LanguageContext);
  const landingContent = contentByLanguage[language]?.landing;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [group, setGroup] = useState("");
  const [faqs, setFaqs] = useState(() => buildFaqs(contentByLanguage[language]?.landing));

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    city: "",
    properties: "",
    comments: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");

  useEffect(() => {
    checkAuthentication();
  }, []);

  useEffect(() => {
    if (!landingContent) return;
    setFaqs((prev) =>
      buildFaqs(landingContent).map((faq, i) => ({ ...faq, isOpen: prev[i]?.isOpen ?? false }))
    );
  }, [landingContent]);

 const checkAuthentication = async () => {
  try {
    const user = await Auth.currentAuthenticatedUser();

    setIsAuthenticated(true);
    setGroup(user.attributes["custom:group"]);
  } catch {
    setIsAuthenticated(false);
  }
};

  const toggleOpen = (index) => {
    setFaqs((prev) =>
      prev.map((faq, i) =>
        i === index ? { ...faq, isOpen: !faq.isOpen } : faq
      )
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (feedbackMessage) setFeedbackMessage("");
  };

  const resetForm = () => {
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      city: "",
      properties: "",
      comments: "",
    });
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    await handleContactFormSubmission(
      formData,
      setIsSubmitting,
      setFeedbackMessage,
      resetForm
    );
  };

  if (!landingContent) return null;

  return (
    <main className="landing">

      <div id="hero">
        <HeroSection landingContent={landingContent} />
      </div>

      <div id="steps">
        <StepsSection landingContent={landingContent} />
      </div>

      <div id="why">
        <WhySection content={landingContent.why} />
      </div>

      <div id="checklist">
        <ChecklistSection content={landingContent.rentingOut} />
      </div>

      <div id="register">
        <RegisterSection content={landingContent.register} />
      </div>

       <div id="testimonials">
         <TestimonialsSection content={landingContent.othersSay} />
      </div>

      <div id="features">
        <FeaturesSection content={landingContent.featuresSection} />
      </div>

      <div id="faq">
        <FaqSection faqs={faqs} toggleOpen={toggleOpen} content={landingContent.answerTo} />
      </div>

      <div id="cta">
        <CtaSection content={landingContent.cta} />
      </div>

      <section id="contact" className="contact-section">
        <div className="contact-section__container">

          <div className="contact-section__left">
            <h2>
              {landingContent.partnerContact.title}<br />
              {landingContent.partnerContact.subtitle}
            </h2>

            <p>
              {landingContent.partnerContact.description}
            </p>

            <div className="contact-section__info">

              <div className="contact-item">
                <div className="icon">✉</div>
                <div>
                  <span>{landingContent.partnerContact.emailLabel}</span>
                  <strong>{landingContent.partnerContact.emailValue}</strong>
                </div>
              </div>

              <div className="contact-item">
                <div className="icon">☎</div>
                <div>
                  <span>{landingContent.partnerContact.phoneLabel}</span>
                  <strong>{landingContent.partnerContact.phoneValue}</strong>
                </div>
              </div>

              <div className="contact-item">
                <div className="icon">📍</div>
                <div>
                  <span>{landingContent.partnerContact.addressLabel}</span>
                  <strong>{landingContent.partnerContact.addressLine1}<br />{landingContent.partnerContact.addressLine2}</strong>
                </div>
              </div>

            </div>
          </div>

          <div className="contact-section__right">
            <ContactForm
              content={landingContent.contactForm}
              formData={formData}
              isSubmitting={isSubmitting}
              feedbackMessage={feedbackMessage}
              onChange={handleInputChange}
              onSubmit={handleContactSubmit}
            />
          </div>

        </div>
      </section>

    </main>
  );
}

export default Landing;
