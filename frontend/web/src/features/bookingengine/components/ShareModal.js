import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import CloseIcon from "@mui/icons-material/Close";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import FacebookIcon from "@mui/icons-material/Facebook";
import TwitterIcon from "@mui/icons-material/Twitter";
import EmailIcon from "@mui/icons-material/Email";
import SmsIcon from "@mui/icons-material/Sms";
import TelegramIcon from "@mui/icons-material/Telegram";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

const PLATFORMS = [
  {
    name: "Email",
    icon: <EmailIcon fontSize="small" />,
    color: "#EA4335",
    getUrl: (url, title) => `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
    openInTab: false,
  },
  {
    name: "WhatsApp",
    icon: <WhatsAppIcon fontSize="small" />,
    color: "#25D366",
    getUrl: (url) => `https://wa.me/?text=${encodeURIComponent(url)}`,
    openInTab: true,
  },
  {
    name: "Facebook",
    icon: <FacebookIcon fontSize="small" />,
    color: "#1877F2",
    getUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    openInTab: true,
  },
  {
    name: "X",
    icon: <TwitterIcon fontSize="small" />,
    color: "#000000",
    getUrl: (url, title) =>
      `https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    openInTab: true,
  },
  {
    name: "Telegram",
    icon: <TelegramIcon fontSize="small" />,
    color: "#0088CC",
    getUrl: (url, title) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
    openInTab: true,
  },
  {
    name: "SMS",
    icon: <SmsIcon fontSize="small" />,
    color: "#34B7F1",
    getUrl: (url) => `sms:?body=${encodeURIComponent(url)}`,
    openInTab: false,
  },
];

const ShareModal = ({ url, title = "Check out this property on Domits", onClose }) => {
  const [copied, setCopied] = useState(false);

  const handlePlatformShare = (platform) => {
    const shareUrl = platform.getUrl(url, title);
    if (platform.openInTab) {
      globalThis.open(shareUrl, "_blank", "noopener,noreferrer");
    } else {
      globalThis.location.href = shareUrl;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const truncatedUrl = url.length > 45 ? `${url.slice(0, 45)}…` : url;

  return ReactDOM.createPortal(
    <div className="share-modal-backdrop">
      <button className="share-modal-backdrop__btn" onClick={onClose} aria-label="Close modal" tabIndex={-1} />
      <dialog className="share-modal" aria-modal="true" aria-label="Share" open>
        <div className="share-modal__header">
          <h2 className="share-modal__title">Share</h2>
          <button type="button" className="share-modal__close" onClick={onClose} aria-label="Close share modal">
            <CloseIcon fontSize="small" />
          </button>
        </div>

        <div className="share-modal__platforms">
          {PLATFORMS.map((platform) => (
            <button
              type="button"
              key={platform.name}
              className="share-modal__platform-btn"
              onClick={() => handlePlatformShare(platform)}
              aria-label={`Share via ${platform.name}`}>
              <span className="share-modal__platform-icon" style={{ backgroundColor: platform.color }}>
                {platform.icon}
              </span>
              <span className="share-modal__platform-name">{platform.name}</span>
            </button>
          ))}
        </div>

        <div className="share-modal__copy-section">
          <p className="share-modal__copy-label">Copy page link</p>
          <div className="share-modal__copy-row">
            <span className="share-modal__copy-url" title={url}>
              {truncatedUrl}
            </span>
            <button
              type="button"
              className={`share-modal__copy-btn${copied ? " share-modal__copy-btn--copied" : ""}`}
              onClick={handleCopy}
              aria-label="Copy link">
              {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </button>
          </div>
        </div>
      </dialog>
    </div>,
    document.body
  );
};

ShareModal.propTypes = {
  url: PropTypes.string.isRequired,
  title: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};

export default ShareModal;
