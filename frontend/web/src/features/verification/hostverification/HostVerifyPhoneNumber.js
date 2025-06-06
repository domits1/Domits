import React from "react";
import styles from "./hostverification.module.css";
import { countries } from "./store/countries";
import { usePhoneNumberForm } from "./hooks/usePhoneNumberForm";
import Toast from "../../../components/toast/Toast";

function PhoneNumberView() {
    const {
        selectedCountry,
        phoneNumber,
        toastMessage,
        isLoading,
        isButtonEnabled,
        handleCountryChange,
        handlePhoneNumberChange,
        handleContinue,
        setToastMessage,
    } = usePhoneNumberForm();

    return (
        <main className={styles["verification-container"]}>
            <div className={styles["headertext-container"]}>
                <h1>What number can guests reach you on?</h1>
                <p>
                    We will send you reservation requests, reminders, and other
                    notifications. You should be able to receive phone calls and text
                    messages on this number.
                </p>
            </div>
            <div className={styles["phonenumber-inputfield"]}>
                <div className={styles["country-select-container"]}>
                    <div className={styles["country-select-wrapper"]}>
                        <select
                            className={styles["country-select"]}
                            onChange={handleCountryChange}
                            value={selectedCountry}
                        >
                            <option value="" disabled>
                                Select a country
                            </option>
                            {countries.map((country, index) => (
                                <option key={index} value={country.code}>
                                    {country.name} ({country.code})
                                </option>
                            ))}
                        </select>
                        <label
                            htmlFor="country-select"
                            className={styles["floating-label"]}
                        >
                            Country/region
                        </label>
                        <div className={styles["country-select-arrow"]}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                width="24"
                                height="24"
                            >
                                <path
                                    d="M7 10l5 5 5-5"
                                    stroke="#000"
                                    strokeWidth="2"
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
                <input
                    type="text"
                    placeholder="Phone number"
                    value={phoneNumber}
                    onChange={handlePhoneNumberChange}
                />
            </div>
            <button
                className={`${styles["publish-btn"]} ${
                    !isButtonEnabled ? styles["disabled-btn"] : ""
                }`}
                disabled={!isButtonEnabled || isLoading}
                onClick={handleContinue}
            >
                {isLoading ? "Sending..." : "Continue"}
            </button>
            <hr />
            <div className={styles["bottom-container"]}></div>
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
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
                <p>Back</p>
            </div>
            <Toast
                message={toastMessage.message}
                status={toastMessage.status}
                duration={3000}
                onClose={() => setToastMessage({ message: "", status: "" })}
            />
        </main>
    );
}

export default PhoneNumberView;
