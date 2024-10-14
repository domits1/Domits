import React from "react";
import styles from "./hostverification.module.css";
import { useState, useEffect } from "react";
import Loading from "./components/Loading";
import useIsRegistrationNumberRequired from "./hooks/useIsRegistrationNumberRequired";

const RegistrationNumber = ({ Address, Next, Previous, setFormData }) => {
  const { isRegistrationNumberRequired, loading, error } =
    useIsRegistrationNumberRequired(Address);

  const [localRegistrationNumber, setLocalRegistrationNumber] = useState("");
  const [isCheckboxChecked, setIsCheckboxChecked] = useState(false);
  const isButtonDisabled = isRegistrationNumberRequired && !isCheckboxChecked;

  const handleContinue = () => {
    setFormData((prevData) => ({
      ...prevData,
      RegistrationNumber: localRegistrationNumber,
    }));

    Next();
  };

  if (loading) {
    return <Loading />;
  }
  if (error) {
    return <p>Something went wrong {error.message}</p>;
  }
  return (
    <main className={styles["verification-container"]}>
      <div className={styles["headertext-container"]}>
        <h1>Add your registration number</h1>
        <p>
          Your registration number will appear on your listing page, so that
          guests know that your accommodation is registered in {Address.City}.
        </p>
      </div>
      <hr></hr>
      <div className={styles["registrationnumber-container"]}>
        <div className={styles["registrationnumber-inputfield"]}>
          {isRegistrationNumberRequired ? (
            <h2>Registration number *</h2>
          ) : (
            <h2>Registration number (optional)</h2>
          )}
          <input
            type="text"
            placeholder="For example: 'Abcd 1234 AB12 89EF A0F9'"
            value={localRegistrationNumber}
            onChange={(e) => setLocalRegistrationNumber(e.target.value)}
          ></input>
        </div>
        <div className={styles["registrationnumber-address"]}>
          <h2>Listing address</h2>
          <p>
            {Address.Street}, {Address.City}, {Address.PostalCode},{" "}
            {Address.Country}
          </p>
        </div>
        {isRegistrationNumberRequired && (
          <div className={styles["registrationnumber-legal"]}>
            <input
              type="checkbox"
              name="example"
              id="exampleCheckbox"
              checked={isCheckboxChecked}
              onChange={(e) => setIsCheckboxChecked(e.target.checked)}
            />
            <p>
              I declare that the data I have entered is complete and correct. I
              also agree that this data may be shared with local authorities to
              confirm that the information is accurate and meets legal
              requirements.
            </p>
          </div>
        )}
      </div>
      <hr></hr>
      <div className={styles["bottom-container"]}>
        <button onClick={Previous} className={styles["publish-btn"]}>
          Previous
        </button>
        <button
          onClick={handleContinue}
          className={
            isButtonDisabled ? styles["disabled-btn"] : styles["publish-btn"]
          }
        >
          Continue
        </button>
      </div>
    </main>
  );
};
export default RegistrationNumber;
