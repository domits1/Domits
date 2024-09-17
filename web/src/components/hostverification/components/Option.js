import React from "react";
import styles from "../hostverification.module.css";

function Option({option}) {
  return (
    <div className={styles["options-container"]}>
      <div className={styles["option-container"]}>
        <p className={styles["option-title"]}>{option}</p>
        <p className={styles["option-text"]}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod.
        </p>
        <p className={styles["option-status"]}>Required</p>
      </div>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="22"
        height="22"
      >
        <path
          d="M9 18l6-6-6-6"
          stroke="#000"
          stroke-width="2"
          fill="none"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  );
}

export default Option;
