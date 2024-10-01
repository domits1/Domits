import React from 'react'
import styles from "./hostverification.module.css";

function PhoneNumberConfirmView() {
  return (
    <main className={styles["verification-container"]}>
    <div className={styles["headertext-container"]}>
      <h1>What number can guests reach you on?</h1>
      <p>
        We will send you reservation requests, reminders and other
        notifications. You should be able to receive phone calls and text
        messages on this number.
      </p>
    </div>
    <div className={styles['code-input-container']}>
    <p>Enter the 4-digit code that Domits just sent to +31 6 12345678:</p>
      <input type="text"></input>
      <button className={styles["publish-btn"]}>Continue</button>
      <p>Didn't receive the code? <span>Resend code</span></p>
    </div>
    <hr></hr>
    <div className={styles["bottom-container"]}></div>
    <div className={styles['back-btn']}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="25"
      height="33"
    >
      <path
        d="M15 6l-6 6 6 6"
        stroke="#000"
        stroke-width="2"
        fill="none"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <p>Back</p>
    </div>
  </main>
  )
}

export default PhoneNumberConfirmView