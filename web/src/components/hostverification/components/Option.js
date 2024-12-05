import React from "react";
import styles from "../hostverification.module.css";

function Option({
  option,
  onClick,
  subtext,
  statusText = "Required",
  disabled = false,
  statusIcon,
}) {
  return (
    <div
      className={`${styles["options-container"]} ${
        disabled ? styles["disabled"] : ""
      }`}
      onClick={!disabled ? onClick : undefined}
      style={{ cursor: disabled ? "not-allowed" : "pointer" }}
    >
      <div className={styles["option-container"]}>
        <p className={styles["option-title"]}>{option}</p>
        <p className={styles["option-text"]}>{subtext}</p>
        <div className={styles["option-status-container"]}>
        <p>{statusIcon}</p>
        <p className={styles["option-status"]}>{statusText}</p>
        </div>
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
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default Option;
