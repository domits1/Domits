import React, { useState } from "react";
import { Auth } from "aws-amplify";
import "./AddContactByUserId.css";

const AddContactByUserId = ({ onContactAdded, onClose }) => {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId.trim()) return;

    // Basic UUID validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId.trim())) {
      setError("Please enter a valid User ID (UUID format)");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user info
      const currentUser = await Auth.currentUserInfo();
      const currentUserId = currentUser.attributes.sub;

      if (currentUserId === userId.trim()) {
        throw new Error("You cannot add yourself as a contact");
      }

      // First, verify the target user exists
      const userCheckResponse = await fetch(
        "https://gernw0crt3.execute-api.eu-north-1.amazonaws.com/default/GetUserInfo",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ UserId: userId.trim() }),
        }
      );

      if (!userCheckResponse.ok) {
        throw new Error("User not found with this User ID");
      }

      const userData = await userCheckResponse.json();
      const userInfo = JSON.parse(userData.body)[0];
      const userName = userInfo.Attributes.find((attr) => attr.Name === "given_name")?.Value || "Unknown User";

      // Generate UUID for contact request
      const contactId = crypto.randomUUID();

      // Add user to contact list
      const addContactResponse = await fetch(
        "https://d1mhedhjkb.execute-api.eu-north-1.amazonaws.com/default/AddUserToContactList",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ID: contactId,
            userID: currentUserId,
            hostID: userId.trim(),
            Status: "pending",
            AccoId: null, // No specific accommodation
          }),
        }
      );

      if (!addContactResponse.ok) {
        const errorData = await addContactResponse.text();
        throw new Error("Failed to send contact request. Please try again.");
      }

      setSuccess(true);
      setUserId("");

      // Call callback if provided
      onContactAdded?.({
        id: contactId,
        userId: userId.trim(),
        name: userName,
        status: "pending",
      });

      // Auto-close after success
      setTimeout(() => {
        onClose?.();
      }, 2000);
    } catch (err) {
      console.error("Error adding contact:", err);
      setError(err.message || "Failed to add contact. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUserIdChange = (e) => {
    setUserId(e.target.value);
    if (error) setError(null); // Clear error when user starts typing
    if (success) setSuccess(false); // Clear success when user starts typing again
  };

  return (
    <div className="add-contact-overlay">
      <div className="add-contact-modal">
        <div className="add-contact-header">
          <h3>Add Contact by User ID</h3>
          {onClose && (
            <button className="close-button" onClick={onClose} type="button">
              ✕
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="add-contact-form">
          <div className="form-group">
            <label htmlFor="contact-userid">User ID</label>
            <input
              id="contact-userid"
              type="text"
              value={userId}
              onChange={handleUserIdChange}
              placeholder="Enter contact's User ID (e.g., 12345678-1234-1234-1234-123456789012)"
              className="userid-input"
              disabled={loading}
              required
            />
            <small className="input-help">You can find your User ID in your account settings</small>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          {success && (
            <div className="success-message">
              <span className="success-icon">✅</span>
              Contact request sent successfully!
            </div>
          )}

          <div className="form-actions">
            {onClose && (
              <button type="button" className="cancel-button" onClick={onClose} disabled={loading}>
                Cancel
              </button>
            )}
            <button type="submit" className="send-button" disabled={loading || !userId.trim()}>
              {loading ? "Sending..." : "Send Contact Request"}
            </button>
          </div>
        </form>

        <div className="add-contact-help">
          <p className="help-text">
            <strong>How to find a User ID:</strong>
          </p>
          <ul className="help-list">
            <li>Go to your account Settings</li>
            <li>Look for "Account Information" or "User ID"</li>
            <li>Copy the UUID format ID (e.g., 12345678-1234-1234-1234-123456789012)</li>
            <li>Share this ID with contacts who want to add you</li>
          </ul>
          <p className="help-text">
            <strong>Note:</strong> The other user will receive a contact request and needs to accept it before you can
            start messaging.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddContactByUserId;
