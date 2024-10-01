import React from "react";
import styles from "./hostverification.module.css";

function PhoneNumberView() {
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
      <div className={styles["phonenumber-inputfield"]}>
        <div className={styles['country-select-container']}>
          <div className={styles['country-select-wrapper']}>
            <select className={styles['country-select']}>
              <option value="United States(+1)">United States(+1)</option>
              <option value="United Kingdom(+44)">United Kingdom(+44)</option>
              <option value="Nederland(+31)">Nederland(+31)</option>
            </select>
            <label for="country-select" className={styles['floating-label']}>Country/region</label>
            <div className={styles['country-select-arrow']}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
              >
                <path
                  d="M7 10l5 5 5-5"
                  stroke="#000"
                  stroke-width="2"
                  fill="none"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
        <input type="text" placeholder="Phone number"></input>
      </div>
      <button className={styles["publish-btn"]}>Continue</button>
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
  );
}

export default PhoneNumberView;
