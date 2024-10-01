import React from 'react'
import styles from "./hostverification.module.css";

function RegistrationNumberCheckView() {
  return (
    <main className={styles['verification-container']}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="8 6 12 10"
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
      <div className={styles['headertext-container']}>
      <h1>Check your details</h1>
      <p>
      Before submitting your registration information, please check that all information is correct.
      </p>
      </div>
      <hr></hr>
      <div className={styles['registrationnumber-inputfield']}>
        <h1>Registration information</h1>
      <h2>Registration number</h2>
      <p>Abcd 1234 AB12 89EF A0F9</p>
      </div>
      <div className={styles['registrationnumber-address']}>
      <h2>Listing address</h2>
      <p>Kinderdijkstraat 15, Amsterdam, Noord-Holland 1079 GB, NL</p>
      </div>
      <hr></hr>
      <div className={styles['bottom-container']}>
      <button className={styles['publish-btn']}>Submit</button>
      </div>
    </main>
  )
}

export default RegistrationNumberCheckView