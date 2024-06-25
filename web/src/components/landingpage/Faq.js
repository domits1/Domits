import React, { useState, useRef, useEffect } from 'react';
import './Faq.css';
import Helpdesk from '../about/Helpdesk';

const FaqItem = ({ question, answer, toggleOpen, isOpen }) => {
  const answerRef = useRef(null);
  return (
    <div className="faq-box" onClick={toggleOpen}>
      <div className="question">{question}</div>
      <div
        className="answer"
        style={{ maxHeight: isOpen ? `${answerRef.current.scrollHeight}px` : '0', overflow: 'hidden' }}
        ref={answerRef}
      >
        {answer}
      </div>
    </div>
  );
};

const Faq = () => {
  const faqData = {
    guest: {
      aboutDomits: [
        {
          question: "Is my information stored securely?",
          answer: "Absolutely, we prioritize your privacy and security above all else...",
          isOpen: false
        },
        {
          question: "How much does Domits charge?",
          answer: "Domits charges a 15% fee for each booking...",
          isOpen: false
        }
      ],

      searchAndBook: [
        {
          question: "How to search and book?",
          answer: "To search and book, enter your destination and dates in the search bar on the homepage, browse the listings, and follow the booking process for your chosen accommodation.",
          isOpen: false
        }
      ],

      manageAccount: [
        {
          question: "How do I create and manage my account?",
          answer: "To create and manage your account, click 'Sign Up' or 'Log In' on the website, follow the prompts to enter your details, and use the account settings to manage your information.",
          isOpen: false
        }
      ]
    },

    host: {
      aboutDomits: [
        {
          question: "Is my information stored securely?",
          answer: "Absolutely, we prioritize your privacy and security above all else...",
          isOpen: false
        },
        {
          question: "How much does Domits charge?",
          answer: "Domits charges a 15% fee for each booking...",
          isOpen: false
        }
      ],

      hosting: [
        {
          question: "How long will my listing stay active on your platform...",
          answer: "Your listing remains active on our platform until you decide to remove it...",
          isOpen: false
        },
        {
          question: "What steps are required to become a verified Domits host...",
          answer: "To become a verified Domits host, you need to complete a verification process...",
          isOpen: false
        },
        {
          question: "What kind of support and resources do you provide...",
          answer: "If your property is not getting booked, consider optimizing your listing...",
          isOpen: false
        }
      ],

      payment: [
        {
          question: "How do payments work?",
          answer: "You will have to create a Stripe Connect account that is coupled to Domits, through which we process all payments and take necessary fees  ",
          isOpen: false
        },
        {
          question: "When can I expect payment after my guest's check-in...",
          answer: "You will receive payment for your booking shortly after your guest's check-in date...",
          isOpen: false
        },
        {
          question: "How do payouts work?",
          answer: "You will receive payment for your booking on your Stripe account, and within a week or so it should be paid out to your bank or otherwise connected wallet",
          isOpen: false
        }
      ],

      manageReservations: [
        {
          question: "How to see, change or cancel your reservations?",
          answer: "Log in to your account, navigate to 'Booking' and select the reservation you want to view, change, or cancel.",
          isOpen: false
        }
      ]
    }
  };

  const [category, setCategory] = useState('guest');
  const [faqs, setFaqs] = useState(faqData[category] || {});

  useEffect(() => {
    setFaqs(faqData[category] || {});
  }, [category]);

  const toggleOpen = (subcategory, index) => {
    setFaqs(currentFaqs => ({
      ...currentFaqs,
      [subcategory]: currentFaqs[subcategory].map((faq, i) => (
        i === index ? { ...faq, isOpen: !faq.isOpen } : faq
      ))
    }));
  };

  return (
    <div className="faq-container">
      <h3 className="faqHeader3">FAQ - Frequently Asked Questions</h3>
      <div className="faq-button-container">
        <button className="faqButton" onClick={() => setCategory('host')}>Host</button>
        <button className="faqButton" onClick={() => setCategory('guest')}>Guest</button>
      </div>
      {category === 'guest' && (
        <>
          <div className="faq-category">
            <h4 className="faqHeader4">About Domits</h4>
            {faqs.aboutDomits?.map((faq, index) => (
              <FaqItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={faq.isOpen}
                toggleOpen={() => toggleOpen('aboutDomits', index)}
              />
            ))}
          </div>

          <div className="faq-category">
            <h4 className="faqHeader4">Search And Book</h4>
            {faqs.searchAndBook?.map((faq, index) => (
              <FaqItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={faq.isOpen}
                toggleOpen={() => toggleOpen('searchAndBook', index)}
              />
            ))}
          </div>

          <div className="faq-category">
            <h4 className="faqHeader4">Manage your account</h4>
            {faqs.manageAccount?.map((faq, index) => (
              <FaqItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={faq.isOpen}
                toggleOpen={() => toggleOpen('manageAccount', index)}
              />
            ))}
          </div>
        </>
      )}

      {category === 'host' && (
        <>
          <div className="faq-category">
            <h4 className="faqHeader4">Hosting</h4>
              {faqs.hosting?.map((faq, index) => (
                <FaqItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={faq.isOpen}
                  toggleOpen={() => toggleOpen('hosting', index)} 
                />
              ))}
         </div>
        
        <div className="faq-category">
            <h4 className="faqHeader4">Payment</h4>
              {faqs.payment?.map((faq, index) => (
                <FaqItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={faq.isOpen}
                  toggleOpen={() => toggleOpen('payment', index)}
                />
              ))}
        </div>

        <div className="faq-category">
            <h4 className="faqHeader4">Manage Reservations</h4>
              {faqs.manageReservations?.map((faq, index) => (
                <FaqItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={faq.isOpen}
                  toggleOpen={() => toggleOpen('manageReservations', index)}
                />
              ))}
        </div>
        </>
      )}
    </div>
  );
};

export default Faq;

