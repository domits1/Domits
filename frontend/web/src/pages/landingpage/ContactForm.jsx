import React from "react";

const ContactForm = ({ content, formData, isSubmitting, feedbackMessage, onChange, onSubmit, onSmoothScroll }) => {
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
              onChange={onChange}
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


