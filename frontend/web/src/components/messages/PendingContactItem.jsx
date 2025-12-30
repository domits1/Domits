import React, { useState } from 'react';
import './PendingContactItem.css';

const PendingContactItem = ({
  contact,
  onAccept,
  onDecline,
  dashboardType,
  loading = false
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState(null); // 'accept' or 'decline'

  const handleAccept = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setActionType('accept');

    try {
      await onAccept?.(contact);
    } catch (error) {
      console.error('Error accepting contact request:', error);
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  const handleDecline = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setActionType('decline');

    try {
      await onDecline?.(contact);
    } catch (error) {
      console.error('Error declining contact request:', error);
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  const isHost = dashboardType === 'host';
  const contactName = contact.givenName || contact.name || 'Unknown User';
  const contactImage = contact.profileImage || contact.image;

  return (
    <div className="pending-contact-item">
      <div className="pending-contact-avatar">
        {contactImage ? (
          <img
            src={contactImage}
            alt={contactName}
            className="avatar-image"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
        ) : null}
        <div
          className="avatar-placeholder"
          style={{ display: contactImage ? 'none' : 'flex' }}
        >
          {contactName.charAt(0).toUpperCase()}
        </div>
      </div>

      <div className="pending-contact-info">
        <div className="contact-main-info">
          <h4 className="contact-name">{contactName}</h4>
          <p className="contact-message">
            {isHost
              ? `Wants to connect with you`
              : `You sent a contact request`
            }
          </p>
        </div>

        {contact.arrivalDate && contact.departureDate && (
          <div className="booking-info">
            <span className="booking-dates">
              📅 {new Date(contact.arrivalDate).toLocaleDateString()} - {new Date(contact.departureDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      <div className="pending-contact-actions">
        {isHost && (
          <>
            <button
              onClick={handleAccept}
              disabled={isProcessing}
              className={`action-button accept-button ${actionType === 'accept' && isProcessing ? 'processing' : ''}`}
              title="Accept contact request"
            >
              {actionType === 'accept' && isProcessing ? (
                <span className="loading-spinner"></span>
              ) : (
                '✓'
              )}
            </button>

            <button
              onClick={handleDecline}
              disabled={isProcessing}
              className={`action-button decline-button ${actionType === 'decline' && isProcessing ? 'processing' : ''}`}
              title="Decline contact request"
            >
              {actionType === 'decline' && isProcessing ? (
                <span className="loading-spinner"></span>
              ) : (
                '✕'
              )}
            </button>
          </>
        )}

        {!isHost && (
          <div className="pending-status">
            <span className="status-text">⏳ Pending</span>
          </div>
        )}
      </div>

      {contact.propertyTitle && (
        <div className="property-info">
          <span className="property-title">🏠 {contact.propertyTitle}</span>
        </div>
      )}
    </div>
  );
};

export default PendingContactItem;
