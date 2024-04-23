import React, { useState, useRef } from 'react';
import './landing.css'; 
import './Faq.css';


const FaqItem = ({ question, answer, toggleOpen, isOpen }) => {
const answerRef = useRef(null);

  return (
    <div className="faq-box" onClick={toggleOpen}>
      <div className="question">{question}</div>
      <div className="answer" style={{ maxHeight: isOpen ? `${answerRef.current.scrollHeight}px` : '0', overflow: 'hidden' }} ref={answerRef}>
        {answer}
      </div>
    </div>
  );
};

const Faq = () => {
  const [faqs, setFaqs] = useState([
    {
      question: "Is my information stored securely?",
      answer: "Absolutely, we prioritize your privacy and security above all else. We implement advanced encryption and industry-standard data protection protocols to secure your personal information. Our systems are regularly updated and tested against security threats. Moreover, access to your personal information is strictly limited to authorized personnel who are required to keep it confidential. If you have any specific concerns or questions about your data security, please do not hesitate to contact us.",
      isOpen: false
    },
    {
      question: "How much does Domits charge?",
      answer: "Domits charges a 15% fee for each booking. This fee is automatically calculated and applied to your total reservation cost, ensuring a transparent and straightforward booking process. If you have further questions about fees or any other aspect of our service, please don't hesitate to reach out.",
      isOpen: false
    },
    {
      question: "How much does Domits charge?",
      answer: "You will receive payment for your booking shortly after your guest's check-in date. The exact timing can vary depending on the payment method you've selected in your account preferences, but typically payments are processed within 24 hours of the guest's arrival. It's our priority to make sure you receive your funds promptly. If you require more detailed information or have specific payment inquiries, our customer service team is always available to assist you.",
      isOpen: false
    },
    {
      question: "How much does Domits charge?",
      answer: "Your listing remains active on our platform until you decide to remove it or if it does not comply with our hosting standards and policies. We encourage you to keep your calendar and listing details up-to-date to maximize your booking potential.",
      isOpen: false
    },
    {
      question: "How much does Domits charge?",
      answer: "To become a verified Domits host, you need to complete a verification process, which includes providing a valid government-issued ID and additional property information. Our team will review your submission and may conduct a property inspection to ensure it meets our standards for safety, comfort, and hospitality.",
      isOpen: false
    },
    {
      question: "How much does Domits charge?",
      answer: "If your property is not getting booked, consider optimizing your listing. This can include updating your photos, adjusting your pricing, enhancing your property description, and ensuring your availability is current. We also offer resources and support to help increase your property's visibility and appeal to potential guests.",
      isOpen: false
    },
  ]);

  const toggleOpen = index => {
    setFaqs(currentFaqs =>
      currentFaqs.map((faq, i) => {
        return i === index ? { ...faq, isOpen: !faq.isOpen } : faq;
      })
    );
  };

  return (
    <div className="faq-container">
      <h3 className="faqHeader3">FAQ - Frequently Asked Questions</h3>
      {faqs.map((faq, index) => (
        <FaqItem 
          key={index} 
          question={faq.question} 
          answer={faq.answer} 
          isOpen={faq.isOpen} 
          toggleOpen={() => toggleOpen(index)}
        />
      ))}
    </div>
  );
};

export default Faq;
