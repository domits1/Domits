import React from "react";
import styles from "./PropertyReviewPage.module.css";

function StateCard({ title, message, children }) {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.eyebrow}>Internal admin</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.message}>{message}</p>
        {children}
      </section>
    </main>
  );
}

export default StateCard;
