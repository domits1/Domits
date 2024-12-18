import React from 'react';
import styles from './StripeModal.module.css';

const StripeModal = ({ isOpen, onClose }) => {
  return (
    <div className={`${styles.StripeModal} ${isOpen ? styles['StripeModal-open'] : ''}`}>
      <h2>Connect your bank details to receive payments</h2>
      <button onClick={onClose}>&times;</button>
    </div>
  );
};

export default StripeModal;