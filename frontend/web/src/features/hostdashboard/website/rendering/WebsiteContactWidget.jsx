import React from "react";
import PropTypes from "prop-types";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { getInteractiveTargetProps } from "./templates/templateSharedSections";
import styles from "./WebsiteTemplatePreview.module.scss";

const VISIBILITY_TARGET = Object.freeze({
  sectionId: "visibility",
  targetId: "visibility.chatWidget",
});

const cleanText = (value) => String(value || "").trim();
const normalizePhoneDigits = (value) => cleanText(value).replaceAll(/\D+/g, "");

const buildWhatsAppHref = (phoneNumberDigits, siteTitle) => {
  if (!phoneNumberDigits) {
    return "";
  }

  const message = `Hi, I'm interested in ${cleanText(siteTitle) || "this stay"}.`;
  return `https://wa.me/${phoneNumberDigits}?text=${encodeURIComponent(message)}`;
};

export default function WebsiteContactWidget({ model, onSelectTarget = undefined, activeTargetId = "" }) {
  const phoneNumberDigits = normalizePhoneDigits(
    model?.host?.whatsapp?.phoneNumberDigits || model?.host?.whatsapp?.phoneNumber
  );
  const href = buildWhatsAppHref(phoneNumberDigits, model?.site?.title);

  if (!href) {
    return null;
  }

  if (onSelectTarget) {
    return (
      <button
        type="button"
        aria-label="WhatsApp widget visibility"
        {...getInteractiveTargetProps(
          styles.visitorChatLauncher,
          onSelectTarget,
          VISIBILITY_TARGET,
          activeTargetId
        )}
      >
        <WhatsAppIcon fontSize="small" />
        <span>WhatsApp host</span>
      </button>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={styles.visitorChatLauncher}
      data-preview-target-id={VISIBILITY_TARGET.targetId}
      aria-label="Chat with host on WhatsApp"
    >
      <WhatsAppIcon fontSize="small" />
      <span>WhatsApp host</span>
    </a>
  );
}

WebsiteContactWidget.propTypes = {
  model: PropTypes.shape({
    host: PropTypes.shape({
      whatsapp: PropTypes.shape({
        phoneNumber: PropTypes.string,
        phoneNumberDigits: PropTypes.string,
        isAvailable: PropTypes.bool,
      }),
    }).isRequired,
    site: PropTypes.shape({
      title: PropTypes.string,
    }).isRequired,
  }).isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};
