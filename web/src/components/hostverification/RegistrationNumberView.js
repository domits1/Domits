import React from "react";
import styles from "./hostverification.module.css";

const RegistrationNumber = () => {
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
      <h1>Add your registration number</h1>
      <p>
        Your registration number will appear on your listing page, so that
        guests know that your accommodation is registered in Amsterdam.
      </p>
      </div>
      <hr></hr>
      <div className={styles['registrationnumber-inputfield']}>
      <h2>Registration number</h2>
      <input type="text" placeholder="For example: 'Abcd 1234 AB12 89EF A0F9'"></input>
      </div>
      <div className={styles['registrationnumber-address']}>
      <h2>Listing address</h2>
      <p>Kinderdijkstraat 15, Amsterdam, Noord-Holland 1079 GB, NL</p>
      </div>
      <div className={styles['registrationnumber-legal']}>
      <input type="checkbox" name="example" id="exampleCheckbox"></input>
      <p>
        I declare that the data I have entered is complete and correct. I also
        agree that this data may be shared with local authorities to confirm
        that the information is accurate and meets legal requirements.
      </p>
        </div>
      <hr></hr>
      <div className={styles['bottom-container']}>
      <button className={styles['publish-btn']}>Continue</button>
      </div>
    </main>
  );
};
export default RegistrationNumber;
