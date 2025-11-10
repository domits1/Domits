import React from 'react';
import profileImage from './domits-logo.jpg';

const MessageToast = ({ contactName, contactImage, message }) => {
  const maxLength = 80;
  const truncatedMessage = message && message.length > maxLength 
    ? `${message.substring(0, maxLength)}...` 
    : message;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%' }}>
      <img 
        src={contactImage || profileImage} 
        alt={contactName || 'Contact'} 
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          objectFit: 'cover',
          flexShrink: 0,
          marginTop: '10px'
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontWeight: 700, 
          fontSize: '16px', 
          marginBottom: '4px',
          color: '#E5E5E5',
          lineHeight: '1.4',
          marginLeft: '2px'
        }}>
          {contactName || 'Contact'}
        </div>
        <div style={{ 
          fontSize: '13px', 
          color: '#B3B3B3',
          wordBreak: 'break-word',
          lineHeight: '1.4',
          marginLeft: '2px'
        }}>
          {truncatedMessage}
        </div>
      </div>
    </div>
  );
};

export default MessageToast;

