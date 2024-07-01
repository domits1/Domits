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
          question: "About Domits",
          answer: "https://www.domits.com/how-it-works",
          isOpen: false
        },
        {
          question: "Why Domits?",
          answer: "https://www.domits.com/why-domits",
          isOpen: false
        }
      ],

      searchAndBook: [
        {
          question: "How to search and book?",
          answer: "To search and book, enter your destination and dates in the search bar on the homepage, browse the listings, and follow the booking process for your chosen accommodation.",
          isOpen: false
        },
        {
          question: "How to see my booking?",
          answer: "...",
          isOpen: false
        },
        {
          question: "How to change my booking?",
          answer: "...",
          isOpen: false
        },
        {
          question: "How do I cancel my booking?",
          answer: "...",
          isOpen: false
        },
        {
          question: "How do I know if an accommodation is available?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I see the address of the accommodation?",
          answer: "...",
          isOpen: false
        },
        {
          question: "What happens when I make a booking? ",
          answer: "...",
          isOpen: false
        },
        {
          question: "I didn’t receive a booking confirmation?",
          answer: "...",
          isOpen: false
        },
        {
          question: "I lost my booking confirmation?",
          answer: "...",
          isOpen: false
        },
        {
          question: "How do I know if an accommodation is suitable for disabled people?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I bring my dog or pet ​​to an accommodation?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I ask the host a question before booking? ",
          answer: "...",
          isOpen: false
        }
      ],

      LoginandAccount: [
        {
          question: "How do I manage my account?",
          answer: "To manage your account, use the account settings to manage your information.",
          isOpen: false
        },
        {
          question: "How do I register on Domits?",
          answer: "To register on Domits click 'Sign up' and fill the account information.",
          isOpen: false
        },
        {
          question: "Is it free to create a guest account? ",
          answer: "Yes, of course!",
          isOpen: false
        },
        {
          question: "Will my data be shared with third parties?",
          answer: "No",
          isOpen: false
        },
        {
          question: "I forgot my password?",
          answer: "If you forgot your password ",
          isOpen: false
        },
        {
          question: "How can I change my password?",
          answer: "...",
          isOpen: false
        },
        {
          question: "How can I log out?",
          answer: "...",
          isOpen: false
        },
        {
          question: "How can I delete my account?",
          answer: "...",
          isOpen: false
        }
      ],

      cancellations: [
        {
          question: "Does Domits have a cancellation policy?",
          answer: "...",
          isOpen: false
        },
        {
          question: "How do I cancel a booking?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I take out cancellation insurance with Domits?",
          answer: "...!",
          isOpen: false
        },
        {
          question: "Can I cancel within 24 hours for free?",
          answer: "...",
          isOpen: false
        }
      ],

      payments: [
        {
          question: "How do payments work?",
          answer: "...",
          isOpen: false
        },
        {
          question: "When do I need to pay?",
          answer: "...!",
          isOpen: false
        },
        {
          question: "Which payment methods are available?",
          answer: "...",
          isOpen: false
        }
      ],

      yourStay: [
        {
          question: "What do I need to know before my stay?",
          answer: "...",
          isOpen: false
        },
        {
          question: "What is the address of the accommodation?",
          answer: "...!",
          isOpen: false
        },
        {
          question: "When can I check in and/or check out?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Is the accommodation cleaned or do I have to do it myself?",
          answer: "...",
          isOpen: false
        },
        {
          question: "What should I do if something is wrong during my stay?",
          answer: "...!",
          isOpen: false
        },
        {
          question: "Can I arrive/depart at a different time?",
          answer: "...",
          isOpen: false
        },
        {
          question: "What should I do if no one is present to handover the key?",
          answer: "...",
          isOpen: false
        },
        {
          question: "What do I need to know during my stay?",
          answer: "...!",
          isOpen: false
        },
        {
          question: "Do I have to bring my own bed linen and towels?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Do I also have to pay tourist tax?",
          answer: "...!",
          isOpen: false
        },
        {
          question: "Can I ask the host a question?",
          answer: "...!",
          isOpen: false
        }
      ]
    },

    host: {
      aboutDomits: [
        {
          question: "About Domits",
          answer: "https://www.domits.com/how-it-works",
          isOpen: false
        },
        {
          question: "Why Domits?",
          answer: "https://www.domits.com/why-domits",
          isOpen: false
        }
      ],

      gettingStarted: [
        {
          question: "How to list my holiday rental?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Is Domits 100% free for hosts? ",
          answer: "...",
          isOpen: false
        },
        {
          question: "How do I create and manage my host account?",
          answer: "...",
          isOpen: false
        },
        {
          question: "How can I connect the Domits calendar with another calendar?",
          answer: "...",
          isOpen: false
        },
        {
          question: "How to message with guests? ",
          answer: "...",
          isOpen: false
        }
      ],

      payouts: [
        {
          question: "How do payouts and taxes work?",
          answer: "...",
          isOpen: false
        },
        {
          question: "When will I be paid for a booking?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Why do I have to share my details with Stripe to receive payouts? ",
          answer: "...",
          isOpen: false
        }
      ],

      cancellations: [
        {
          question: "Does Domits have a cancellation policy?",
          answer: "...",
          isOpen: false
        },
        {
          question: "What if someone cancels directly with me and not with Domits?",
          answer: "...",
          isOpen: false
        },
        {
          question: "What if I, as a host, have to cancel a booking?",
          answer: "...",
          isOpen: false
        }
      ],

      yourAccomodations: [
        {
          question: "When do I know that my accommodation has been approved?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Why has my accommodation not been approved?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I edit my holiday accommodation?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I edit the name and description for my accommodation?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I edit the photos of my accommodation?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I edit the price of my accommodation? ",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I edit the availability calendar of my accommodation? ",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I edit the amount of guests for my accommodation?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I edit the location of my accommodation? ",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I edit the amenities of my accommodation?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I edit my space type (entire house, room or shared room)?",
          answer: "...",
          isOpen: false
        }
      ],

      booking: [
        {
          question: "How to manage my bookings?",
          answer: "...",
          isOpen: false
        },
        {
          question: "Can I communicate with the guest after the booking?",
          answer: "...",
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
            <h4 className="faqHeader4">Login and Account</h4>
            {faqs.LoginandAccount?.map((faq, index) => (
              <FaqItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={faq.isOpen}
                toggleOpen={() => toggleOpen('LoginandAccount', index)}
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
            <h4 className="faqHeader4">Cancellations</h4>
            {faqs.cancellations?.map((faq, index) => (
              <FaqItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={faq.isOpen}
                toggleOpen={() => toggleOpen('cancellations', index)}
              />
            ))}
          </div>

          <div className="faq-category">
            <h4 className="faqHeader4">Payments</h4>
            {faqs.payments?.map((faq, index) => (
              <FaqItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={faq.isOpen}
                toggleOpen={() => toggleOpen('payments', index)}
              />
            ))}
          </div>

          <div className="faq-category">
            <h4 className="faqHeader4">Your Stay</h4>
            {faqs.yourStay?.map((faq, index) => (
              <FaqItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={faq.isOpen}
                toggleOpen={() => toggleOpen('yourStay', index)}
              />
            ))}
          </div>
        </>
      )}

      {category === 'host' && (
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
            <h4 className="faqHeader4">Getting started as a host</h4>
              {faqs.gettingStarted?.map((faq, index) => (
                <FaqItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={faq.isOpen}
                  toggleOpen={() => toggleOpen('gettingStarted', index)} 
                />
              ))}
         </div>
        
        <div className="faq-category">
            <h4 className="faqHeader4">Payouts</h4>
              {faqs.payouts?.map((faq, index) => (
                <FaqItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={faq.isOpen}
                  toggleOpen={() => toggleOpen('payouts', index)}
                />
              ))}
        </div>

        <div className="faq-category">
            <h4 className="faqHeader4">Cancellations</h4>
              {faqs.cancellations?.map((faq, index) => (
                <FaqItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={faq.isOpen}
                  toggleOpen={() => toggleOpen('cancellations', index)}
                />
              ))}
        </div>

        <div className="faq-category">
            <h4 className="faqHeader4">Bookings</h4>
              {faqs.booking?.map((faq, index) => (
                <FaqItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={faq.isOpen}
                  toggleOpen={() => toggleOpen('booking', index)}
                />
              ))}
        </div>

        <div className="faq-category">
            <h4 className="faqHeader4">Your Accommodations</h4>
              {faqs.yourAccomodations?.map((faq, index) => (
                <FaqItem
                  key={index}
                  question={faq.question}
                  answer={faq.answer}
                  isOpen={faq.isOpen}
                  toggleOpen={() => toggleOpen('yourAccomodations', index)}
                />
              ))}
        </div>
        </>
      )}
    </div>
  );
};

export default Faq;

