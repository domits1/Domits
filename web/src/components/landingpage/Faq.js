import React, { useState, useRef, useEffect } from 'react';
import './Faq.css';
import Helpdesk from '../about/Helpdesk';
import { useNavigate } from 'react-router-dom';

const FaqItem = ({ question, answer, toggleOpen, isOpen }) => {
  const answerRef = useRef(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (answerRef.current) {
      setHeight(answerRef.current.scrollHeight);
    }
  }, [isOpen]);

  return (
    <div className="faq-box" onClick={toggleOpen}>
      <div className="question">{question}</div>
      <div
        className="answer"
        style={{ maxHeight: isOpen ? `${height}px` : '0', overflow: 'hidden' }}
        ref={answerRef}
      >
        {answer}
      </div>
    </div>
  );
};

  const Faq = ({ searchQuery = '' }) => {
  const faqData = {
    guest: {
      aboutDomits: [
        {
          question: "What is Domits and how does it work?",          
          answer: (
            <>
              Domits is a platform where you can rent out your property for guests to book. As a host, you list your property on Domits, and guests can book it for short or long-term stays. A full explanation about how Domits works can be found on{" "}
              <a href="https://www.domits.com/how-it-works" target="_blank" rel="noopener noreferrer">
                here
              </a>.
            </>
          ),
          isOpen: false
        },
        {
          question: "Why Domits?",

          answer: (
            <>
              Domits offers a unique experience for both Hosts and Guests by using innovative ideas that enhance the booking and hosting experience. We prioritize ease of use, security, and transparency for all users. More about why Domits can be found on{" "} 
              <a href="https://www.domits.com/why-domits" target="_blank" rel="noopener noreferrer">
                here
              </a>.
            </>
          ),

          isOpen: false
        }
      ],

      manageAccount: [
        {
          question: "How do I register on Domits?",
          answer: "To create your account, simply click 'Sign Up' or 'Log In' on the website, and follow the prompts to enter your details. After the verification step, you will have access to your own Domits account!",
          isOpen: false
        },
        {
          question: "How do I manage my account?",
          answer: "Managing your account is simple. Navigate to your dashboard and use the designated tabs for each setting or overview, including profile management, booking history, and payment settings.",
          isOpen: false
        },
        {
          question: "Is it free to create a guest account?",
          answer: "Yes, it's completely free to create a guest account on Domits.",
          isOpen: false
        },
        {
          question: "Will my data be shared with third parties?",
          answer: "All the information you share with Domits stays with us. We do not share your data with third parties without your explicit consent.",
          isOpen: false
        },
        {
          question: "I forgot my password.",
          answer: "To reset your password, simply click the 'I forgot my password' button on the sign-in page and follow the instructions.",
          isOpen: false
        },
        {
          question: "How can I change my password?",
          answer: "To change your password, navigate to the dashboard and click on the 'Settings' tab. There you will see the option to change your password.",
          isOpen: false
        },
        {
          question: "How can I log out?",
          answer: "To log out use the button in the dropdown located at the top-right of your screen.",
          isOpen: false
        },
        {
          question: "How can I delete my account?",
          answer: "To delete your account, navigate to the dashboard and click on the 'Settings' tab. There you will see the option to delete your Domits account.",
          isOpen: false
        }
      ],

      searchAndBook: [
        {
          question: "How do I search and book?",
          answer: "To search and book, enter your destination and dates in the search bar on the homepage, browse the listings, and follow the booking process for your chosen accommodation.",
          isOpen: false
        },
        {
          question: "How do I see my bookings?",
          answer: "To see your bookings, navigate to the dashboard and click on the tab 'Bookings'.",
          isOpen: false
        },
        {
          question: "How do I change my booking?",
          answer: "Currently, it is not possible to change a booking after it has been confirmed.",
          isOpen: false
        },
        {
          question: "How do I cancel my booking?",
          answer: "Currently, it is not possible to cancel a booking through the platform. Please contact the host directly if you need to discuss changes.",
          isOpen: false
        },
        {
          question: "How do I know if an accommodation is available?",
          answer: "When searching for accommodations, you can select a date range to ensure that the accommodations you see are available. Without using the search, you can click on any accommodation and see the dates it is available under 'Booking details'.",
          isOpen: false
        },
        {
          question: "Can I see the address of the accommodation?",
          answer: "The address of an accommodation is found within the details when you click on the listing.",
          isOpen: false
        },
        {
          question: "What happens when I make a booking?",
          answer: "You will have booked an accommodation for the dates you have selected, which you can see in the 'Bookings' tab.",
          isOpen: false
        },
        {
          question: "I didn't receive a booking confirmation.",
          answer: "If you didn’t receive a booking confirmation, please check your spam/junk folder. If it’s not there, contact Domits support for assistance.",
          isOpen: false
        },
        {
          question: "I lost my booking confirmation.",
          answer: "If you lost your booking confirmation, you can always view and download it again from the 'Bookings' tab in your account dashboard.",
          isOpen: false
        },
        {
          question: "How do I know if an accommodation is suitable for disabled people?",
          answer: "This information is available in the amenities section of each accommodation. Look for details regarding accessibility features.",
          isOpen: false
        },
        {
          question: "Can I bring my dog or pet to an accommodation?",
          answer: "This differs per accommodation. Some hosts allow pets, while others may not. This information is available in the details of each accommodation.",
          isOpen: false
        },
        {
          question: "Can I ask the host a question before booking?",
          answer: "Yes, you can chat with a Host by clicking the 'Chat' button on the accommodation's page.",
          isOpen: false
        }
      ],

      cancellations: [
        {
          question: "Does Domits have a cancellation policy?",
          answer: "Domits has a cancellation policy that varies depending on the accommodation. Please refer to the specific listing's cancellation terms before booking.",
          isOpen: false
        },
        {
          question: "How do I cancel a booking?",
          answer: "To cancel a booking, you must contact Domits support directly. Currently, there is no option to cancel through the dashboard.",
          isOpen: false
        },
        {
          question: "Can I take out cancellation insurance with Domits?",
          answer: "Currently, Domits does not offer cancellation insurance. We recommend looking into third-party options if you are concerned about the need to cancel.",
          isOpen: false
        },
        {
          question: "Can I cancel within 24 hours for free?",
          answer: "The possibility to cancel within 24 hours for free depends on the individual host's cancellation policy. Check the specific listing for details.",
          isOpen: false
        },
        {
          question: "What if a host cancels my booking?",
          answer: "The possibility to cancel within 24 hours for free depends on the individual host's cancellation policy. Check the specific listing for details.",
          isOpen: false
        }
      ],

      payments: [
        {
          question: "How do payments work?",
          answer: "When you fill in your booking information on the accommodation page, you can proceed to the Booking Overview page and press the 'Confirm & Pay' button to complete your payment.",
          isOpen: false
        },
        {
          question: "When do I need to pay?",
          answer: "Payments are required at the time of booking. Your reservation is not confirmed until payment has been processed.",
          isOpen: false
        },
        {
          question: "Which payment methods are available?",
          answer: "Currently, we offer two payment options: credit card and iDeal. More options will be available soon.",
          isOpen: false
        }
      ],

      yourStay: [
        {
          question: "What do I need to know before my stay?",
          answer: "Before your stay, make sure you’ve communicated with the host about check-in details, and read any house rules or specific instructions provided in the listing.",
          isOpen: false
        },
        {
          question: "What is the address of the accommodation?",
          answer: "The address of the accommodation is listed in the details when you click on the accommodation on the homepage.",
          isOpen: false
        },
        {
          question: "Can I arrive/depart at a different time?",
          answer: "Arriving or departing at a different time than stated in the booking may be possible but must be arranged directly with the host. Be sure to communicate any changes in advance.",
          isOpen: false
        },
        {
          question: "What should I do if no one is present to handover the key?",
          answer: "If no one is present to hand over the key at the agreed time, contact the host immediately through our dedicated messaging channels.",
          isOpen: false
        },
        {
          question: "What do I need to know during my stay?",
          answer: "During your stay, adhere to the house rules provided by the host, and make sure to communicate any issues or concerns promptly.",
          isOpen: false
        },
        {
          question: "What should I do if something is wrong during my stay?",
          answer: "If something is wrong during your stay, contact the Host as your first point of contact. If they are not available or unable to assist, you can reach out to Domits support for help.",
          isOpen: false
        },
        {
          question: "Is the accommodation cleaned, or do I have to do it myself?",
          answer: "Hosts may charge a cleaning fee, which usually means they will take care of the cleaning. If no fee is charged, it may be expected that you leave the accommodation in a clean state.",
          isOpen: false
        },
        {
          question: "When can I check in and/or check out?",
          answer: "When booking an accommodation, you select your check-in and check-out dates. After booking, contact the host to arrange specific times for check-in and check-out.",
          isOpen: false
        },
        {
          question: "Do I have to bring my own bed linen and towels?",
          answer: "This depends on the accommodation. Some will provide bed linen and towels, while others may require you to bring your own. Check the listing details for this information.",
          isOpen: false
        },
        {
          question: "Do I also have to pay tourist tax?",
          answer: "Tourist tax, if applicable, will be indicated during the booking process. It depends on the location of the accommodation.",
          isOpen: false
        },
        {
          question: "Can I ask the host a question?",
          answer: "You can always contact the host through our messaging channels. Just press the 'Chat' button on their accommodation listing.",
          isOpen: false
        },
        {
          question: "Can I extend my stay once I’m already at the accommodation?",
          answer: "If you wish to extend your stay, contact the host directly to discuss availability and payment. Any extensions must be agreed upon by both parties.",
          isOpen: false
        },
        
        {
          question: "Can I ask the host a question?",
          answer: "You can always contact the host through our messaging channels. You only need to press 'chat' on one of their accommodations.",
          isOpen: false
        }
      ],
      support: [
        {
          question: "How do I contact Domits support?",
          answer: "You can contact Domits support by filling in our contact form here. We aim to respond to all inquiries within 24 hours.",
          isOpen: false
        },
        {
          question: "What should I do if I encounter a technical issue on the website?",
          answer: "If you encounter a technical issue on the Domits website, please try refreshing the page or clearing your browser's cache. If the issue persists, contact our support team via the contact form, and include as much detail as possible about the problem.",
          isOpen: false
        },
        {
          question: "Can I get support in multiple languages?",
          answer: "Currently, our support is primarily offered in English and Dutch. However, we are working to expand our language support in the near future.",
          isOpen: false
        },
        {
          question: "What should I do if I have a dispute with a host or guest?",
          answer: "If you have a dispute with a host or guest, we encourage you to first try resolving the issue through direct communication using our messaging system. If the issue cannot be resolved, contact Domits support through our contact form, and we will assist in mediating the situation.",
          isOpen: false
        },
        {
          question: "Is there a phone number I can call for support?",
          answer: "At this time, Domits does not offer phone support. All inquiries should be submitted through our contact form, and our team will get back to you as soon as possible.",
          isOpen: false
        },
        {
          question: "How do I report inappropriate content or behavior?",
          answer: "If you come across inappropriate content or behavior on the platform, please report it immediately by contacting our support team through the contact form. Include all relevant details so we can take appropriate action.",
          isOpen: false
        },
        {
          question: "How can I track the status of my support request?",
          answer: "Once you submit a support request through our contact form, you will receive a confirmation email with a reference number. You can use this number to follow up on your request if needed.",
          isOpen: false
        },
        {
          question: "What should I do if my support issue is urgent?",
          answer: "If your issue is urgent, such as a problem during your stay or a last-minute booking issue, please indicate the urgency in your contact form submission. Our team prioritizes urgent requests and will respond as quickly as possible.",
          isOpen: false
        },
        {
          question: "Can I provide feedback about my support experience?",
          answer: "Yes, we value your feedback. After your support issue is resolved, you will receive an email with a link to provide feedback on your experience. Your input helps us improve our services.",
          isOpen: false
        }
      ]      
    },

    host: {
      aboutDomits: [
        {
          question: "What is Domits and how does it work?",
          answer: "Domits is a platform where you can rent out your property for guests to book.",
          isOpen: false
        },
        {
          question: "Why Domits?",
          answer: "Domits offers a unique experience for both Hosts and Guests by making use of innovative ideas that enhance the experience.",
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
          answer: "Hosts can list their accommodations on Domits free of charge. However, Domits applies a 15% service fee to each booking, which is deducted from the rent.",
          isOpen: false
        },
        {
          question: "How do I create and manage my host account?",
          answer: "Creating your Host account is straightforward. Click the 'Become a Host' button at the top right of the website and follow the instructions. Managing your account is easy with the Host Dashboard, where you can oversee your listings, bookings, and earnings.",
          isOpen: false
        },
        {
          question: "How can I connect the Domits calendar with another calendar?",
          answer: "Currently, connecting your Domits calendar with external calendars is not possible, but this feature is a priority, and we plan to implement it soon.",
          isOpen: false
        },
        {
          question: "How to message with guests?",
          answer: "You can communicate with guests through the 'Messages' tab in your dashboard. For now, only guests can initiate a conversation, but you can respond to any messages they send.",
          isOpen: false
        }
      ],
      
      payment: [
        {
          question: "How do payments work?",
          answer: "To receive payments, you need to create a Stripe Connect account and link it to Domits via the button in your dashboard. All payments are processed through Stripe, where the necessary fees are automatically deducted.",
          isOpen: false
        },
        {
          question: "When will I be paid for a booking?",
          answer: "Payment timelines are currently under discussion, but typically, payments will be processed shortly after the guest checks in. Exact details will be provided in your Stripe account once finalized.",
          isOpen: false
        },
        {
          question: "How do payouts work?",
          answer: "Payments for your bookings will be deposited into your linked Stripe account. From there, Stripe will transfer the funds to your bank account or connected wallet within a week.",
          isOpen: false
        },
        {
          question: "Why do I have to share my details with Stripe to receive payouts?",
          answer: "Stripe requires your details to verify your identity and ensure secure payment processing. This verification helps protect both hosts and guests.",
          isOpen: false
        }
      ],
      
      cancellations: [
        {
          question: "Does Domits have a cancellation policy?",
          answer: "Domits is in the process of finalizing a standard cancellation policy that will apply to all bookings. Details will be shared soon.",
          isOpen: false
        },
        {
          question: "What if someone cancels directly with me and not through Domits?",
          answer: "If a guest cancels directly with you, it is important to update the booking status on Domits to reflect the cancellation. More detailed procedures are being developed and will be provided.",
          isOpen: false
        },
        {
          question: "What if I, as a host, have to cancel a booking?",
          answer: "Hosts are encouraged to avoid cancellations, but if you must cancel a booking, you should do so through your dashboard as soon as possible. Domits is developing guidelines for host cancellations, including possible penalties or guest compensation.",
          isOpen: false
        }
      ],
      
      yourAccommodations: [
        {
          question: "When do I know that my accommodation has been approved?",
          answer: "Once your accommodation is approved, it will be listed on the Domits homepage. We are also working on implementing a notification system to alert you when your listing is live.",
          isOpen: false
        },
        {
          question: "Why has my accommodation not been approved?",
          answer: "If your accommodation has not yet been approved, it may be because it does not meet Domits' terms or our team has not reviewed it yet. Please ensure that your listing complies with all guidelines, and feel free to contact support for an update.",
          isOpen: false
        },
        {
          question: "Can I edit my holiday accommodation?",
          answer: "Yes, you can edit your accommodation details at any time. Simply go to your dashboard, navigate to 'Listings', and click 'Edit' on the property you wish to update.",
          isOpen: false
        },
        {
          question: "Can I edit the name and description of my accommodation?",
          answer: "Yes, you can edit both the name and description of your accommodation in your dashboard under the 'Listings' section.",
          isOpen: false
        },
        {
          question: "Can I edit the photos of my accommodation?",
          answer: "Yes, you can upload new photos or change existing ones in your dashboard.",
          isOpen: false
        },
        {
          question: "Can I edit the price of my accommodation?",
          answer: "Yes, you can update the pricing of your accommodation anytime through the dashboard.",
          isOpen: false
        },
        {
          question: "Can I edit the availability calendar of my accommodation?",
          answer: "Yes, you can manage and update the availability calendar for your accommodation via the dashboard.",
          isOpen: false
        },
        {
          question: "Can I edit the number of guests for my accommodation?",
          answer: "Yes, you can specify the maximum number of guests allowed for your accommodation in the dashboard settings.",
          isOpen: false
        },
        {
          question: "Can I edit the location of my accommodation?",
          answer: "Yes, the location of your accommodation can be edited if needed through the dashboard.",
          isOpen: false
        },
        {
          question: "Can I edit the amenities of my accommodation?",
          answer: "Yes, you can update the list of amenities offered at your accommodation at any time.",
          isOpen: false
        },
        {
          question: "Can I edit my space type (entire house, room, or shared room)?",
          answer: "Yes, you can select and edit the type of space you are offering (e.g., entire house, private room, or shared room) in the dashboard.",
          isOpen: false
        }
      ],
      
      bookings: [
        {
          question: "How do I manage my bookings?",
          answer: "An upcoming feature will allow you to manage your bookings more efficiently directly through the dashboard. Stay tuned for updates.",
          isOpen: false
        },
        {
          question: "Can I communicate with the guest after the booking?",
          answer: "Yes, once a guest has initiated a conversation through the messaging tab, you can continue to communicate with them using the same platform.",
          isOpen: false
        }
      ],
      
      manageReservations: [
        {
          question: "How do I see, change, or cancel my reservations?",
          answer: "Log in to your account, navigate to 'Bookings', and select the reservation you want to view, change, or cancel. Make sure to confirm any changes to keep your records updated.",
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

const containsAllWords = (text, searchQuery) => {
  const words = searchQuery.toLowerCase().split(' ').filter(Boolean); // Splits zoekterm op woorden
  return words.every(word => text.includes(word)); // Controleer of elk woord in de tekst zit
};

const filteredFaqs = {};
Object.keys(faqs).forEach((subcategory) => {
  const subcategoryMatch = containsAllWords(subcategory.toLowerCase(), searchQuery);

  const filteredItems = faqs[subcategory].filter((faq) => {
    const answerText = React.Children.toArray(faq.answer?.props?.children)
      .map(child => (typeof child === 'string' ? child : ''))
      .join(' ')
      .toLowerCase();

    const questionText = faq.question.toLowerCase();
    return containsAllWords(questionText, searchQuery) || containsAllWords(answerText, searchQuery); // Zoek in vraag en antwoord
  });

  if (subcategoryMatch) {
    filteredFaqs[subcategory] = faqs[subcategory];
  } else if (filteredItems.length > 0) {
    filteredFaqs[subcategory] = filteredItems;
  }
});

    const navigate = useNavigate();

    const handleNavigation = (category) => {
      if (category === 'host') {
        setCategory('host');
        navigate('/helpdesk-host');
      } else if (category === 'guest') {
        setCategory('guest');
        navigate('/helpdesk-guest');
      }
    };

  return (
    <div className="faq-container">
      <h3 className="faqHeader3">FAQ - Frequently Asked Questions</h3>
  
      <div className="faq-button-container">
        <button className="faqButton" onClick={() => handleNavigation('host')}>Host</button>
        <button className="faqButton" onClick={() => handleNavigation('guest')}>Guest</button>
      </div>

      {searchQuery && (
        <p className="foundResults">
          {Object.keys(filteredFaqs).reduce((total, subcategory) => total + filteredFaqs[subcategory].length, 0)} results found for "{searchQuery}"
        </p>
      )}
      
      {Object.keys(filteredFaqs).length === 0 && searchQuery && (
        <p>No results found for "{searchQuery}". Try searching for something else or check your spelling.</p>
      )}
  
      {Object.keys(filteredFaqs).map((subcategory) => (
        <div key={subcategory} className="faq-category">
          <h4 className="faqHeader4">
            {subcategory.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </h4>

          {filteredFaqs[subcategory].map((faq, index) => (
            <FaqItem
              key={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={faq.isOpen}
              toggleOpen={() => toggleOpen(subcategory, index)}
            />
          ))}
        </div>
      ))}
  
      {Object.keys(filteredFaqs).length === 0 && !searchQuery && (
        <>
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
  
              <div className="faq-category">
                <h4 className="faqHeader4">Support</h4>
                {faqs.support?.map((faq, index) => (
                  <FaqItem
                    key={index}
                    question={faq.question}
                    answer={faq.answer}
                    isOpen={faq.isOpen}
                    toggleOpen={() => toggleOpen('support', index)}
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
        </>
      )}
    </div>
  );
  
};

export default Faq;

