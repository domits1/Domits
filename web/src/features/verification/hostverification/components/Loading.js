import React from 'react';
import styles from '../loading.module.css';

function Loading() {
  return (
    <div className={styles.loadingPage}>
      <div className={styles.dot}></div>
      <div className={styles.dot}></div>
      <div className={styles.dot}></div>
    </div>
  );
}

export default Loading;
