import React from 'react';
import './landing.css'; 

const Faq = () => {
  return (
    <div className="faq-container">
      
      <h3>FAQ - Frequently Asked Questions</h3>
      <div className="faq-box">
        <div className="question">Is my information stored securely?</div>
        <div className="answer">Answer 1</div>
      </div>

      {/* FAQ Box 2 */}
      <div className="faq-box">
        <div className="question">How much does Domits charge?</div>
        <div className="answer">Answer 2</div>
      </div>

      {/* FAQ Box 3 */}
      <div className="faq-box">
        <div className="question">When do I get paid?</div>
        <div className="answer">Answer 3</div>
      </div>

      {/* FAQ Box 4 */}
      <div className="faq-box">
        <div className="question">How long is my listing valid?</div>
        <div className="answer">Answer 4</div>
      </div>

      {/* FAQ Box 5 */}
      <div className="faq-box">
        <div className="question">How can i become a verified Domits host?</div>
        <div className="answer">Answer 5</div>
      </div>

      {/* FAQ Box 6 */}
      <div className="faq-box">
        <div className="question">What if my property does not get booked?</div>
        <div className="answer">Answer 6</div>
      </div>
    </div>
  );
};

export default Faq;
