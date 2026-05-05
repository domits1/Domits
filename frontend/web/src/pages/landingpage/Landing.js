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

function Landing() {
  const { language } = useContext(LanguageContext);
  const landingContent = contentByLanguage[language]?.landing;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [faqs, setFaqs] = useState([]);

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

    setFaqs([
      {
        question: landingContent.answerTo.host.title,
        answer: landingContent.answerTo.host.description,
        isOpen: false,
      },
      {
        question: landingContent.answerTo.how.title,
        answer: landingContent.answerTo.how.description,
        isOpen: false,
      },
      {
        question: landingContent.answerTo.manage.title,
        answer: landingContent.answerTo.manage.description,
        isOpen: false,
      },
      {
        question: landingContent.answerTo.payout.title,
        answer: landingContent.answerTo.payout.description,
        isOpen: false,
      },
      {
        question: landingContent.answerTo.calendar.title,
        answer: landingContent.answerTo.calendar.description,
        isOpen: false,
      },
    ]);
  }, [landingContent]);

  const checkAuthentication = async () => {
    try {
      await Auth.currentAuthenticatedUser();
      setIsAuthenticated(true);
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

      <HeroSection landingContent={landingContent} />

      <StepsSection landingContent={landingContent} />

      <WhySection />

      <ChecklistSection />

      <RegisterSection />

      <TestimonialsSection />

      <FeaturesSection />

      <FaqSection faqs={faqs} toggleOpen={toggleOpen} />

      <CtaSection />

      <section className="contact-section">
        <div className="contact-section__container">

          <div className="contact-section__left">
            <h2>
              More than software.<br />
              A dedicated partner.
            </h2>

            <p>
              Our team is here to answer your questions, discuss your property's potential, and help you get started on the path to effortless rental income.
            </p>

            <div className="contact-section__info">

              <div className="contact-item">
                <div className="icon">✉</div>
                <div>
                  <span>Email us</span>
                  <strong>teamdomits@gmail.com</strong>
                </div>
              </div>

              <div className="contact-item">
                <div className="icon">☎</div>
                <div>
                  <span>Call us</span>
                  <strong>Available 24/7</strong>
                </div>
              </div>

              <div className="contact-item">
                <div className="icon">📍</div>
                <div>
                  <span>Visit us</span>
                  <strong>Kinderhuissingel 6-K<br />2013 AS, Haarlem</strong>
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