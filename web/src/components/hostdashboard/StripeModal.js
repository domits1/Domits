import React from 'react';

const StripeModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '20px', zIndex: 1000 }}>
      <h2>You Need a Stripe Account</h2>
      <p>To receive payments, you need to set up a Stripe account.</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
};

export default StripeModal;