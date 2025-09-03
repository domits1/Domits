import React from "react";

const ContactForm = ({ content, formData, isSubmitting, feedbackMessage, onChange, onSubmit, onSmoothScroll }) => {
  // Input constraints
  const PHONE_CHAR_REGEX = /^[0-9+\s]$/;
  const DIGIT_CHAR_REGEX = /^[0-9]$/;
  const ALLOWED_KEYS = [
    'Backspace',
    'Delete',
    'Tab',
    'Escape',
    'Enter',
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown'
  ];

  const isAllowedKey = (key) => ALLOWED_KEYS.includes(key);
  const isValidPhoneKey = (key) => PHONE_CHAR_REGEX.test(key);
  const isValidPhonePaste = (text) => /^[0-9+\s]*$/.test(text);
  const isValidDigitKey = (key) => DIGIT_CHAR_REGEX.test(key);
  const isValidDigitPaste = (text) => /^[0-9]*$/.test(text);
  return (
    <div className="questionsContainer" id="Contact">
      <h1>{content.title}</h1>
      <p>{content.description}</p>

      {feedbackMessage && (
        <p className={`feedback ${feedbackMessage.includes("successfully") ? "success" : "error"}`}>
          {feedbackMessage}
        </p>
      )}

      <form className="contactform" onSubmit={onSubmit}>
        <div className="inputContainer">
          <label>
            {content.fields.firstName}
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={onChange}
              placeholder={content.placeholders.firstName}
              required
            />
          </label>

          <label>
            {content.fields.lastName}
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={onChange}
              placeholder={content.placeholders.lastName}
              required
            />
          </label>

          <label>
            {content.fields.email}
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              placeholder={content.placeholders.email}
              required
            />
          </label>

          <label>
            {content.fields.phone}
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={onChange}
              onKeyPress={(e) => {
                if (!isValidPhoneKey(e.key) && !isAllowedKey(e.key)) {
                  e.preventDefault();
                }
              }}
              onPaste={(e) => {
                const paste = e.clipboardData.getData('text');
                if (!isValidPhonePaste(paste)) {
                  e.preventDefault();
                }
              }}
              placeholder={content.placeholders.phone}
              required
            />
          </label>

          <label>
            {content.fields.city}
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={onChange}
              placeholder={content.placeholders.city}
              required
            />
          </label>

          <label>
            {content.fields.properties}
            <input
              type="number"
              name="properties"
              value={formData.properties}
              onChange={(e) => {
                // Enforce numeric-only input via typing and paste
                const { value } = e.target;
                if (value === '' || /^[0-9]+$/.test(value)) {
                  onChange(e);
                }
              }}
              onKeyPress={(e) => {
                if (!isValidDigitKey(e.key) && !isAllowedKey(e.key)) {
                  e.preventDefault();
                }
              }}
              onPaste={(e) => {
                const paste = e.clipboardData.getData('text');
                if (!isValidDigitPaste(paste)) {
                  e.preventDefault();
                }
              }}
              placeholder={content.placeholders.properties}
              min="1"
              required
            />
          </label>
        </div>

        <div className="biginput">
          <label>
            {content.fields.comments}
            <textarea
              name="comments"
              value={formData.comments}
              onChange={onChange}
              placeholder={content.placeholders.comments}
              required
            ></textarea>
          </label>
        </div>

        <div className="formbuttons">
          <button id="sendbutton" type="submit" disabled={isSubmitting}>
            {isSubmitting ? content.sending : content.submit}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactForm;


