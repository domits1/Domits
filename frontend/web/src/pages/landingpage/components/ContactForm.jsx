import React from "react";
import { motion } from "framer-motion";
import { fadeUp, staggerContainer } from "../utils/animations";
import "../../../styles/sass/pages/landingpage/components/_contactForm.scss";

const ContactForm = ({ content, formData, isSubmitting, feedbackMessage, onChange, onSubmit }) => {
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
    <motion.div
      className="questionsContainer"
      id="Contact"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={staggerContainer}
    >

      <motion.h1 variants={fadeUp}>{content.title}</motion.h1>
      <motion.p variants={fadeUp}>{content.description}</motion.p>

      {feedbackMessage && (
        <motion.p
          className={`feedback ${feedbackMessage.includes("successfully") ? "success" : "error"}`}
          variants={fadeUp}
        >
          {feedbackMessage}
        </motion.p>
      )}

      <motion.form className="contactform" onSubmit={onSubmit} variants={staggerContainer}>

        <motion.div className="inputContainer" variants={staggerContainer}>

          <motion.label variants={fadeUp}>
            {content.fields.firstName}
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={onChange}
              placeholder={content.placeholders.firstName}
              required
            />
          </motion.label>

          <motion.label variants={fadeUp}>
            {content.fields.lastName}
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={onChange}
              placeholder={content.placeholders.lastName}
              required
            />
          </motion.label>

          <motion.label variants={fadeUp}>
            {content.fields.email}
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onChange}
              placeholder={content.placeholders.email}
              required
            />
          </motion.label>

          <motion.label variants={fadeUp}>
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
          </motion.label>

          <motion.label variants={fadeUp}>
            {content.fields.city}
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={onChange}
              placeholder={content.placeholders.city}
              required
            />
          </motion.label>

          <motion.label variants={fadeUp}>
            {content.fields.properties}
            <input
              type="number"
              name="properties"
              value={formData.properties}
              onChange={(e) => {
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
          </motion.label>

        </motion.div>

        <motion.div className="fullWidth" variants={fadeUp}>
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
        </motion.div>

        <motion.button
          id="sendbutton"
          type="submit"
          disabled={isSubmitting}
          variants={fadeUp}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
        >
          {isSubmitting ? content.sending : content.submit}
        </motion.button>

      </motion.form>

    </motion.div>
  );
};

export default ContactForm;