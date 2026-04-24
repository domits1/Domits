import React, { useState } from "react";
import PropTypes from "prop-types";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import { sendWebsiteContactMessage } from "../services/websiteContactService";
import styles from "./WebsiteTemplatePreview.module.scss";

const INITIAL_FORM_STATE = Object.freeze({
  name: "",
  email: "",
  message: "",
});

export default function WebsiteContactWidget({ model }) {
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState(INITIAL_FORM_STATE);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const updateField = (fieldKey) => (event) => {
    setFormState((currentFormState) => ({
      ...currentFormState,
      [fieldKey]: event.target.value,
    }));
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    setStatusMessage("");
    setErrorMessage("");
    setIsSending(true);

    try {
      await sendWebsiteContactMessage({
        model,
        name: formState.name,
        email: formState.email,
        message: formState.message,
      });
      setFormState(INITIAL_FORM_STATE);
      setStatusMessage("Message sent. The host can reply from Domits messages.");
    } catch (error) {
      setErrorMessage(error?.message || "We could not send this message yet.");
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className={styles.visitorChatLauncher}
        onClick={() => setIsOpen(true)}
        aria-label="Contact host"
      >
        <ChatBubbleOutlineIcon fontSize="small" />
        <span>Contact host</span>
      </button>
    );
  }

  return (
    <aside className={styles.visitorChatPanel} aria-label="Contact host widget">
      <div className={styles.visitorChatHeader}>
        <div>
          <p className={styles.visitorChatEyebrow}>Host contact</p>
          <h3>Message the owner</h3>
        </div>
        <button
          type="button"
          className={styles.visitorChatCloseButton}
          onClick={() => setIsOpen(false)}
          aria-label="Close contact widget"
        >
          <CloseOutlinedIcon fontSize="small" />
        </button>
      </div>

      <form className={styles.visitorChatForm} onSubmit={sendMessage}>
        <label>
          <span>Name</span>
          <input value={formState.name} onChange={updateField("name")} placeholder="Your name" />
        </label>
        <label>
          <span>Email</span>
          <input value={formState.email} onChange={updateField("email")} placeholder="you@example.com" />
        </label>
        <label>
          <span>Message</span>
          <textarea
            value={formState.message}
            onChange={updateField("message")}
            placeholder={`Ask about ${model.site.title || "this stay"}`}
            required
          />
        </label>

        {statusMessage ? <p className={styles.visitorChatSuccess}>{statusMessage}</p> : null}
        {errorMessage ? <p className={styles.visitorChatError}>{errorMessage}</p> : null}

        <button type="submit" className={styles.visitorChatSendButton} disabled={isSending}>
          <SendOutlinedIcon fontSize="small" />
          {isSending ? "Sending..." : "Send message"}
        </button>
      </form>
    </aside>
  );
}

WebsiteContactWidget.propTypes = {
  model: PropTypes.shape({
    source: PropTypes.shape({
      hostId: PropTypes.string,
      propertyId: PropTypes.string,
    }).isRequired,
    site: PropTypes.shape({
      title: PropTypes.string,
    }).isRequired,
  }).isRequired,
};
