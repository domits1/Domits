import React from 'react';
import './HostHomepage.css';

const StripeModal = ({ isOpen, onClose }) => {
  return (
    <article className={`StripeModal ${isOpen ? 'StripeModal-open' : ''}`}>
      <h2>You Need a Stripe Account to receive payments</h2>
      <button onClick={onClose}>&times;</button>
    </article>
  );
};

export default StripeModal;