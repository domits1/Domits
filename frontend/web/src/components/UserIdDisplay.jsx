import React, { useState, useEffect } from 'react';
import { Auth } from 'aws-amplify';
import './UserIdDisplay.css';

const UserIdDisplay = ({ title = "Account Information", showCopyButton = true, className = "" }) => {
  const [userId, setUserId] = useState('');
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      setLoading(true);
      const userInfo = await Auth.currentUserInfo();

      if (userInfo && userInfo.attributes) {
        setUserId(userInfo.attributes.sub || '');
        setUserInfo({
          id: userInfo.attributes.sub || '',
          email: userInfo.attributes.email || '',
          name: userInfo.attributes.given_name || '',
          username: userInfo.username || '',
        });
      } else {
        setError('Unable to fetch user information');
      }
    } catch (err) {
      console.error('Error fetching user info:', err);
      setError('Failed to load user information');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatUserId = (id) => {
    if (!id) return '';
    // Show first 8 characters, then ... then last 4 characters
    if (id.length > 16) {
      return `${id.substring(0, 8)}...${id.substring(id.length - 4)}`;
    }
    return id;
  };

  if (loading) {
    return (
      <div className={`user-id-display loading ${className}`}>
        <div className="user-id-content">
          <div className="loading-spinner"></div>
          <p>Loading user information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`user-id-display error ${className}`}>
        <div className="user-id-content">
          <div className="error-icon">⚠️</div>
          <p className="error-message">{error}</p>
          <button onClick={fetchUserInfo} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`user-id-display ${className}`}>
      <div className="user-id-header">
        <h3>{title}</h3>
        <div className="user-id-status">
          <span className="status-dot active"></span>
          <span className="status-text">Active Account</span>
        </div>
      </div>

      <div className="user-id-content">
        <div className="user-id-section">
          <label className="user-id-label">User ID</label>
          <div className="user-id-value-container">
            <code className="user-id-value" title={userId}>
              {formatUserId(userId)}
            </code>
            {showCopyButton && (
              <button
                onClick={() => copyToClipboard(userId)}
                className={`copy-button ${copied ? 'copied' : ''}`}
                title="Copy full User ID"
              >
                {copied ? '✓' : '📋'}
              </button>
            )}
          </div>
          <p className="user-id-description">
            This unique identifier is used for messaging and account linking.
          </p>
        </div>

        {userInfo && (
          <div className="user-details">
            <div className="user-detail-item">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{userInfo.name || 'Not set'}</span>
            </div>
            <div className="user-detail-item">
              <span className="detail-label">Email:</span>
              <span className="detail-value">{userInfo.email}</span>
            </div>
            <div className="user-detail-item">
              <span className="detail-label">Username:</span>
              <span className="detail-value">{userInfo.username}</span>
            </div>
          </div>
        )}
      </div>

      {copied && (
        <div className="copy-notification">
          User ID copied to clipboard!
        </div>
      )}

      <div className="user-id-help">
        <details>
          <summary>How to use your User ID</summary>
          <ul>
            <li>Share this ID with other users to connect for messaging</li>
            <li>Use it when setting up test environments</li>
            <li>Required for account verification and support requests</li>
            <li>Keep this ID private and only share with trusted contacts</li>
          </ul>
        </details>
      </div>
    </div>
  );
};

export default UserIdDisplay;
