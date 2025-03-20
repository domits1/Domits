import React from "react";
import DigitInputs from "../../../components/ui/DigitsInputs/DigitsInputs";
import styles from "../../verification/hostverification/styles/hostverification.module.css";
import confirmEmailStyles from "./confirmEmail.module.css";
import Toast from "../../../components/toast/Toast";
import { useConfirmEmailLogic } from "./ConfirmEmailLogic.js";

function ConfirmEmailView() {
  const {
    inputRef,
    isComplete,
    loading,
    hasError,
    toastConfig,
    handleComplete,
    onSubmit,
    resendCode,
    setToastConfig,
    userEmail,
  } = useConfirmEmailLogic();
  return (
    <main className={styles["verification-container"]}>
      <Toast
        message={toastConfig.message}
        status={toastConfig.status}
        duration={toastConfig.duration}
        onClose={() =>
          setToastConfig({ message: "", status: "", duration: 3000 })
        }
      />
      <div className={styles["headertext-container"]}>
        <h1 className={confirmEmailStyles["confirm-email-header"]}>
          Enter your code
        </h1>
      </div>
      <div className={styles["code-input-container"]}>
        <p className={confirmEmailStyles["confirm-email-text"]}>
          We sent your verification code to {userEmail}. Enter your code below.
        </p>
        <DigitInputs
          amount={6}
          inputRef={inputRef}
          onComplete={handleComplete}
          error={hasError}
        />
        <button
          className={`${styles["publish-btn"]} ${
            !isComplete ? styles["disabled-btn"] : ""
          }`}
          disabled={!isComplete}
          onClick={onSubmit}
        >
          Continue
        </button>
        <p className={confirmEmailStyles["confirm-email-text"]}>
          If you don't see the email in your inbox, check your spam folder and
          promotions tab. If you still don't see it,{" "}
          <a style={{ color: "blue", cursor: "pointer" }} onClick={resendCode}>
            request a resend
          </a>
          .
        </p>
      </div>
      <hr></hr>
      <div className={styles["bottom-container"]}>
      <div className={styles["back-btn"]}>
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
      </div>
    </main>
  );
}

export default ConfirmEmailView;
