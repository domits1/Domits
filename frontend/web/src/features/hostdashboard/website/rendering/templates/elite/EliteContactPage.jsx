import React from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";
import { getInteractiveTargetProps } from "../templateSharedSections";
import { buildPanoramaContactContent } from "../panoramaContactContent";

export default function EliteContactPage({ model, viewState, onSelectTarget = undefined, activeTargetId = "" }) {
  if (!viewState.showContactSection) {
    return null;
  }

  const contact = buildPanoramaContactContent(model);
  const targetProps = (className, targetId) =>
    getInteractiveTargetProps(className, onSelectTarget, { sectionId: "contact", targetId }, activeTargetId);

  return (
    <section className={`${styles.eliteSection} ${styles.eliteContact}`} aria-label={contact.contactTitle}>
      <div className={styles.eliteContactCopy}>
        <p {...targetProps(styles.eliteEyebrow, "contact.title")}>{contact.contactTitle}</p>
        <h2 {...targetProps(styles.eliteHeading, "contact.caption")}>{contact.contactCaption}</h2>
        <p {...targetProps(styles.eliteContactText, "contact.description")}>{contact.contactDescription}</p>
      </div>
      <div className={styles.eliteHostCard}>
        <div {...targetProps(styles.eliteHostAvatar, "contact.avatarImage")}>
          {contact.hostProfileImage ? (
            <img src={contact.hostProfileImage} alt={contact.hostName} className={styles.eliteHostAvatarImage} />
          ) : (
            <span aria-hidden="true">{contact.hostInitial}</span>
          )}
        </div>
        <div className={styles.eliteHostCopy}>
          <p className={styles.eliteHostLabel}>Hosted by</p>
          <p className={styles.eliteHostName}>{contact.hostName}</p>
        </div>
      </div>
    </section>
  );
}

EliteContactPage.propTypes = {
  model: PropTypes.object.isRequired,
  viewState: PropTypes.shape({ showContactSection: PropTypes.bool.isRequired }).isRequired,
  onSelectTarget: PropTypes.func,
  activeTargetId: PropTypes.string,
};
