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
          question: "What is Domits and how does it work?",
          answer: "Domits is a platform where you can rent out your property for guests to book",
          isOpen: false
        },
        {
          question: "Why Domits?",
          answer: "Domits offers an unique experience for both Hosts and Guests by making use of innovative ideas that enhance the experience.",
          isOpen: false
        }
      ],

      manageAccount: [
        {
          question: "How do I register on Domits?",
          answer: "To create your account,  simply click 'Sign Up' or 'Log In' on the website, follow the prompts to enter your details. After the verification step you will have acces to your own Domits account!",
          isOpen: false
        },
        {
          question: "How do I manage my account?",
          answer: "Managing your account is as simple as navigating to your dashboard and using the designated tabs for each setting or overview.",
          isOpen: false
        },
        {
          question: "How do I create and manage my account?",
          answer: "To create and manage your account, click 'Sign Up' or 'Log In' on the website, follow the prompts to enter your details, and use the account settings to manage your information.",
          isOpen: false
        },
        {
          question: "Is it free to create a guest account?",
          answer: "Yes, it's completely free to create a guest account on Domits.",
          isOpen: false
        },
        {
          question: "Will my data be shared with third parties?",
          answer: "All the information you share with Domits will stay with us.",
          isOpen: false
        },
        {
          question: "I forgot my password?",
          answer: "To reset your password, simply click the 'I forgot my password' button on the sign-in page.",
          isOpen: false
        },
        {
          question: "How can I change my password?",
          answer: "To change your password, navigate to the dashboard and click on the 'settings' tab. There you will see the option to change your password.",
          isOpen: false
        },
        {
          question: "How can I log out?",
          answer: "To log out use the button in the dropdown located at the top-right of your screen.",
          isOpen: false
        },
        {
          question: "How can I delete my account?",
          answer: "To delete your account, navigate to the dashboard and click on the 'settings' tab. There you will see the option delete your Domits account.",
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
          answer: "To see your bookings, navigate to the dashboard and click on the tab 'Bookings'.",
          isOpen: false
        },
        {
          question: "How to change my booking?",
          answer: "Currently not possible.",
          isOpen: false
        },
        {
          question: "How do I cancel my booking?",
          answer: "Currently not possible.",
          isOpen: false
        },
        {
          question: "How do I know if an accommodation is available?",
          answer: "When searching for accommodations you can choose a date range, that way you will know for sure that the accommodations you see are available. Without using the search, you can click on any accommodation and see the dates it is available on under 'Booking details'.",
          isOpen: false
        },
        {
          question: "Can I see the address of the accommodation?",
          answer: "The address of an accommodation is found withing the details when you click on one.",
          isOpen: false
        },
        {
          question: "What happens when I make a booking?",
          answer: "You will have booked an accommodation for the dates you have selected, which you can see in the 'Bookings' tab.",
          isOpen: false
        },
        {
          question: "I didn't receive a booking confirmation?",
          answer: "Placeholder",
          isOpen: false
        },
        {
          question: "I lost my booking confirmation?",
          answer: "Placeholder",
          isOpen: false
        },
        {
          question: "How do I know if an accommodation is suitable for disabled people?",
          answer: "This information will be available within the amenities section of each accommodation.",
          isOpen: false
        },
        {
          question: "Can I bring my dog or pet to an accommodation?",
          answer: "This differs per accommodation, some hosts will allow this and others may choose not to. This information will be available in the details of each accommodation.",
          isOpen: false
        },
        {
          question: "Can I ask the host a question before booking?",
          answer: "Yes, you can choose to chat with a Host by simply clicking the 'Chat' button when you click on an accommodation.",
          isOpen: false
        }
      ],

      cancellations: [
        {
          question: "Does Domits have a cancellation policy?",
          answer: "Placeholder",
          isOpen: false
        },
        {
          question: "How do I cancel a booking?",
          answer: "Placeholder",
          isOpen: false
        },
        {
          question: "Can I take out cancellation insurance with Domits?",
          answer: "Placeholder",
          isOpen: false
        },
        {
          question: "Can I cancel within 24 hours for free?",
          answer: "Placeholder",
          isOpen: false
        }
      ],

      payments: [
        {
          question: "How do payments work?",
          answer: "When you fill in your booking information on the page of an accommodation you can proceed to the Booking Overview page and press the 'Confirm & Pay' button.",
          isOpen: false
        },
        {
          question: "When do I need to pay?",
          answer: "As of right now, payments are instant for the guests.",
          isOpen: false
        },
        {
          question: "Which payment methods are available?",
          answer: "Right now we have two options. The first is to use your credit card and the second is using iDeal.",
          isOpen: false
        }
      ],

      yourStay: [
        {
          question: "What do I need to know before my stay?",
          answer: "Placeholder",
          isOpen: false
        },
        {
          question: "What is the address of the accommodation?",
          answer: "The address of the accommodation is listed in the details when you click on one on the homepage.",
          isOpen: false
        },
        {
          question: "Can I arrive/depart at a different time?",
          answer: "Placeholder",
          isOpen: false
        },
        {
          question: "What should I do if no one is present to handover the key?",
          answer: "You can contact the host of the accommodation through our dedicated messaging channels.",
          isOpen: false
        },
        {
          question: "What do I need to know during my stay?",
          answer: "Placeholder",
          isOpen: false
        },
        {
          question: "What should I do if something is wrong during my stay?",
          answer: "Contact the Host, if that's not feasible Domits is always available to be contacted.",
          isOpen: false
        },
        {
          question: "Is the accommodation cleaned or do I have to do it myself?",
          answer: "Hosts have the option to add cleaning fees to the price. If they haven't, this could mean it is expected you leave the accommodation as clean as possible.",
          isOpen: false
        },
        {
          question: "When can I check in and/or check out?",
          answer: "While booking an accommodation you choose which dates you will be there, upon booking you can contact the host in order to arrange what times you can check in and check out.",
          isOpen: false
        },
        {
          question: "Do I have to bring my own bed linen and towels?",
          answer: "That depends on the accommodation, some of them will have more amenities than the others.",
          isOpen: false
        },
        {
          question: "Do I also have to pay tourist tax?",
          answer: "Placeholder",
          isOpen: false
        },
        {
          question: "Can I ask the host a question?",
          answer: "You can always contact the host through our messaging channels. You only need to press 'chat' on one of their accommodations.",
          isOpen: false
        }
      ]
    },

    host: {
      aboutDomits: [
        {
          question: "What is Domits and how does it work?",
          answer: "Domits is a platform where you can rent out your property for guests to book",
          isOpen: false
        },
        {
          question: "Why Domits?",
          answer: "Domits offers an unique experience for both Hosts and Guests by making use of innovative ideas that enhance the experience.",
          isOpen: false
        }
      ],

      hosting: [
        {
          question: "How to list my holiday rental?",
          answer: "To list your rental, you simply use the Dashboard and press the 'Add new accommodation' button.",
          isOpen: false
        },
        {
          question: "Is Domits 100% free for hosts?",
          answer: "Hosts can use Domits to list their accommodations free of charge. Domits does however add a 15% fee charge to the rent",
          isOpen: false
        },
        {
          question: "How do I create and manage my host account?",
          answer: "Creating your Host account is as simple as clicking the 'Become a Host' button at the top right of the website, and managing your account is even simpler using the dedicated Host Dashboard designed for your needs.",
          isOpen: false
        },
        {
          question: "How can I connect the Domits calendar with another calendar?",
          answer: "Connecting your calendar is not possible as of now, but it is a priority for us to implement this feature as soon as possible.",
          isOpen: false
        },
        {
          question: "How to message with guests? ",
          answer: "Messaging with guests is done through the 'Messages' tab in your dashboard. For the time being only guests can initiate a chat.",
          isOpen: false
        }
      ],

      payment: [
        {
          question: "How do payments work?",
          answer: "You will have to create a Stripe Connect account that is coupled to Domits using the button on your dashboard, through which we process all payments and take necessary fees",
          isOpen: false
        },
        {
          question: "When will I be paid for a booking?",
          answer: "To be discussed...",
          isOpen: false
        },
        {
          question: "How do payouts work?",
          answer: "You will receive payment for your booking on your Stripe account, and within a week or so it should be paid out to your bank or otherwise connected wallet",
          isOpen: false
        },
        {
          question: "Why do I have to share my details with Stripe to receive payouts?",
          answer: "Stripe will have to verify your information in order to handle payments securely.",
          isOpen: false
        }
      ],

      cancellations: [
        {
          question: "Does Domits have a cancellation policy?",
          answer: "To be discussed...",
          isOpen: false
        },
        {
          question: "What if someone cancels directly with me and not with Domits?",
          answer: "To be discussed...",
          isOpen: false
        },
        {
          question: "What if I, as a host, have to cancel a booking?",
          answer: "To be discussed...",
          isOpen: false
        }
      ],

      yourAccommodations: [
        {
          question: "When do I know that my accommodation has been approved?",
          answer: "When your accommodation has been approved it will be listed on the homepage of Domits. We are working on a notification system for this.",
          isOpen: false
        },
        {
          question: "Why has my accommodation not been approved?",
          answer: "Our employees are hard at work to approve accommodations that meet our terms. If your accommodation has not yet been approved this means we haven't gotten to it yet or that your accommodation does not meet our terms.",
          isOpen: false
        },
        {
          question: "Can I edit my holiday accommodation? ",
          answer: "Yes, in your dashboard at the Listings you can simply press edit for each of your accommodations. ",
          isOpen: false
        },
        {
          question: "Can I edit the name and description for my accommodation?",
          answer: "Yes",
          isOpen: false
        },
        {
          question: "Can I edit the photos of my accommodation?",
          answer: "Yes",
          isOpen: false
        },
        {
          question: "Can I edit the price of my accommodation?",
          answer: "Yes",
          isOpen: false
        },
        {
          question: "Can I edit the availability calendar of my accommodation?",
          answer: "Yes",
          isOpen: false
        },
        {
          question: "Can I edit the amount of guests for my accommodation?",
          answer: "Yes",
          isOpen: false
        },
        {
          question: "Can I edit the location of my accommodation?",
          answer: "Yes",
          isOpen: false
        },
        {
          question: "Can I edit the amenities of my accommodation?",
          answer: "Yes",
          isOpen: false
        },
        {
          question: "Can I edit my space type (entire house, room or shared room)?",
          answer: "Yes",
          isOpen: false
        }
      ],

      bookings: [
        {
          question: "How to manage my bookings?",
          answer: "Upcoming feature",
          isOpen: false
        },
        {
          question: "Can I communicate with the guest after the booking? ",
          answer: "As of now, if the guest has contacted you through our messaging tab you can communicate with them through there.",
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
            <h4 className="faqHeader4">Your stay</h4>
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
            <h4 className="faqHeader4">Your Accommodations</h4>
            {faqs.yourAccommodations?.map((faq, index) => (
              <FaqItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={faq.isOpen}
                toggleOpen={() => toggleOpen('yourAccommodations', index)}
              />
            ))}
          </div>

          <div className="faq-category">
            <h4 className="faqHeader4">Bookings</h4>
            {faqs.bookings?.map((faq, index) => (
              <FaqItem
                key={index}
                question={faq.question}
                answer={faq.answer}
                isOpen={faq.isOpen}
                toggleOpen={() => toggleOpen('bookings', index)}
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

