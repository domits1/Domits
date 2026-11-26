import React from "react";
import PropTypes from "prop-types";
import styles from "./eliteSitePage.module.scss";

export default function EliteFooter({ title, location = "" }) {
  return (
    <footer className={styles.eliteFooter}>
      <div className={`${styles.eliteSection} ${styles.eliteFooterInner}`}>
        <span className={styles.eliteFooterName}>{title}</span>
        {location ? <span>{location}</span> : null}
      </div>
    </footer>
  );
}

EliteFooter.propTypes = {
  title: PropTypes.string.isRequired,
  location: PropTypes.string,
};
