import React from 'react'
import styles from '../loading.module.css'

function Loading() {
  return (
    <div className={styles["loading-page"]}>
      <div className={styles["dot big"]}></div>
      <div className={styles["dot medium"]}></div>
      <div className={styles["dot small"]}></div>
    </div>
  )
}

export default Loading